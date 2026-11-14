package uz.hisobla.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import java.io.File;

/**
 * Ilova ichida yangilanish: yangi APK DownloadManager bilan yuklanadi (bildirishnomada jarayon ko'rinadi),
 * tugagach Android'ning o'rnatish oynasi ochiladi. Foydalanuvchi ma'lumotlari saqlanib qoladi.
 */
final class UpdateInstaller {
    /** Faqat o'z GitHub relizlarimizdan yuklaymiz. */
    private static final String ALLOWED_PREFIX = "https://github.com/Javohir877/hisobla/releases/";
    private static final String APK_MIME = "application/vnd.android.package-archive";

    interface Listener {
        void onStatus(String status); // "failed" yoki "permission"
    }

    private final Activity activity;
    private final Listener listener;
    private long downloadId = -1;
    private boolean waitingForPermission = false;
    private BroadcastReceiver receiver;

    UpdateInstaller(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
    }

    /** Ilovaning o'z papkasi — ruxsat talab qilmaydi (kontekst tayyor bo'lgach chaqiriladi). */
    private File apkFile() {
        return new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hisobla-update.apk");
    }

    void download(String url) {
        if (url == null || !url.startsWith(ALLOWED_PREFIX)) { listener.onStatus("failed"); return; }
        File apkFile = apkFile();
        if (apkFile.exists()) apkFile.delete();
        DownloadManager manager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                .setTitle("Hisobla yangilanishi")
                .setDescription("Yangi versiya yuklanmoqda")
                .setMimeType(APK_MIME)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationUri(Uri.fromFile(apkFile));
        try {
            downloadId = manager.enqueue(request);
        } catch (Exception e) {
            listener.onStatus("failed");
            return;
        }
        listenForCompletion(manager);
    }

    private void listenForCompletion(DownloadManager manager) {
        if (receiver != null) return;
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != downloadId) return;
                if (succeeded(manager, id)) install();
                else listener.onStatus("failed");
            }
        };
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) activity.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
        else activity.registerReceiver(receiver, filter);
    }

    private static boolean succeeded(DownloadManager manager, long id) {
        try (Cursor cursor = manager.query(new DownloadManager.Query().setFilterById(id))) {
            return cursor != null && cursor.moveToFirst()
                    && cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL;
        }
    }

    /** O'rnatish oynasini ochish; Android 8+ da avval "noma'lum manbalar" ruxsati kerak bo'lishi mumkin. */
    void install() {
        File apkFile = apkFile();
        if (!apkFile.exists()) return;
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            waitingForPermission = true;
            listener.onStatus("permission");
            activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + activity.getPackageName())));
            return;
        }
        waitingForPermission = false;
        Uri uri = Build.VERSION.SDK_INT >= 24
                ? FileProvider.getUriForFile(activity, activity.getPackageName() + ".files", apkFile)
                : Uri.fromFile(apkFile);
        Intent intent = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, APK_MIME)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            activity.startActivity(intent);
        } catch (Exception e) {
            listener.onStatus("failed");
        }
    }

    /** Foydalanuvchi ruxsat berib ilovaga qaytganda o'rnatishni davom ettiramiz. */
    void onResume() {
        if (waitingForPermission && Build.VERSION.SDK_INT >= 26 && activity.getPackageManager().canRequestPackageInstalls()) {
            install();
        }
    }

    void release() {
        if (receiver != null) {
            try { activity.unregisterReceiver(receiver); } catch (IllegalArgumentException ignored) { }
            receiver = null;
        }
    }
}
