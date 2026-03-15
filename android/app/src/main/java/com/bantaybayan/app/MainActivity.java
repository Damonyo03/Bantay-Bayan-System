package com.bantaybayan.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Get the WebView from Capacitor Bridge
        WebView webView = getBridge().getWebView();

        // Enable JavascriptInterface for Blob support
        webView.addJavascriptInterface(new BlobDownloadInterface(this), "AndroidBlobDownloader");

        // Set DownloadListener for standard URLs
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                // Handle standard URL downloads
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                
                // Get Cookies for authenticated routes
                String cookies = CookieManager.getInstance().getCookie(url);
                request.addRequestHeader("Cookie", cookies);
                request.addRequestHeader("User-Agent", userAgent);
                
                request.setDescription("Downloading PDF Report...");
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimetype);
                request.setTitle(fileName);
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(request);
                
                Toast.makeText(MainActivity.this, "Downloading file...", Toast.LENGTH_SHORT).show();
            }
        });

        // Inject helper script for Blob handling
        webView.getSettings().setJavaScriptEnabled(true);
        injectBlobScript(webView);
    }

    private void injectBlobScript(WebView webView) {
        // This script intercepts blob: URL clicks and converts them to Base64 to pass to Android
        String blobScript = "javascript:(function() {" +
                "  var originalCreateElement = document.createElement;" +
                "  document.createElement = function(tagName) {" +
                "    var element = originalCreateElement.apply(this, arguments);" +
                "    if (tagName.toLowerCase() === 'a') {" +
                "      var originalClick = element.click;" +
                "      element.click = function() {" +
                "        if (this.href && this.href.startsWith('blob:')) {" +
                "          var xhr = new XMLHttpRequest();" +
                "          xhr.open('GET', this.href, true);" +
                "          xhr.responseType = 'blob';" +
                "          var fileName = this.download || 'document.pdf';" +
                "          xhr.onload = function() {" +
                "            if (this.status === 200) {" +
                "              var blob = this.response;" +
                "              var reader = new FileReader();" +
                "              reader.onloadend = function() {" +
                "                var base64data = reader.result.split(',')[1];" +
                "                AndroidBlobDownloader.downloadBlob(base64data, fileName);" +
                "              };" +
                "              reader.readAsDataURL(blob);" +
                "            }" +
                "          };" +
                "          xhr.send();" +
                "          return;" +
                "        }" +
                "        return originalClick.apply(this, arguments);" +
                "      };" +
                "    }" +
                "    return element;" +
                "  };" +
                "})();";
        webView.loadUrl(blobScript);
    }

    /**
     * JavaScript Interface to handle Blob downloads passed as Base64
     */
    public class BlobDownloadInterface {
        Context context;

        BlobDownloadInterface(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void downloadBlob(String base64Data, String fileName) {
            try {
                byte[] pdfAsBytes = Base64.decode(base64Data, Base64.DEFAULT);
                File dwldDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File file = new File(dwldDir, fileName);
                
                FileOutputStream os = new FileOutputStream(file, false);
                os.write(pdfAsBytes);
                os.flush();
                os.close();

                // Notify DownloadManager/MediaScanner about the new file
                DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                dm.addCompletedDownload(fileName, "Downloaded PDF Report", true, "application/pdf", file.getAbsolutePath(), pdfAsBytes.length, true);
                
                runOnUiThread(() -> Toast.makeText(context, "PDF saved to Downloads", Toast.LENGTH_LONG).show());
            } catch (IOException e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(context, "Error saving PDF", Toast.LENGTH_SHORT).show());
            }
        }
    }
}
