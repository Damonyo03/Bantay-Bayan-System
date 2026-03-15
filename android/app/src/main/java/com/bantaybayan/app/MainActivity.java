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
import android.print.PrintManager;
import android.print.PrintDocumentAdapter;
import android.print.PrintAttributes;
import android.print.PrintDocumentInfo;
import android.print.PageRange;

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

        @JavascriptInterface
        public void printBlob(String base64Data, String jobName) {
            try {
                byte[] pdfAsBytes = Base64.decode(base64Data, Base64.DEFAULT);
                File dwldDir = context.getExternalCacheDir();
                File file = new File(dwldDir, jobName + ".pdf");
                
                FileOutputStream os = new FileOutputStream(file, false);
                os.write(pdfAsBytes);
                os.flush();
                os.close();

                PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                String jobNameEscaped = jobName != null ? jobName : "Bantay Bayan Document";
                PrintDocumentAdapter pda = new PrintDocumentAdapter() {
                    @Override
                    public void onWrite(PageRange[] pages, android.os.ParcelFileDescriptor destination, android.os.CancellationSignal cancellationSignal, WriteResultCallback callback) {
                        java.io.InputStream input = null;
                        java.io.OutputStream output = null;
                        try {
                            input = new java.io.FileInputStream(file);
                            output = new java.io.FileOutputStream(destination.getFileDescriptor());
                            byte[] buf = new byte[1024];
                            int bytesRead;
                            while ((bytesRead = input.read(buf)) > 0) {
                                output.write(buf, 0, bytesRead);
                            }
                            callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
                        } catch (Exception e) {
                            callback.onWriteFailed(e.toString());
                        } finally {
                            try { if (input != null) input.close(); } catch (IOException e) {}
                            try { if (output != null) output.close(); } catch (IOException e) {}
                        }
                    }

                    @Override
                    public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, android.os.CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
                        if (cancellationSignal.isCanceled()) {
                            callback.onLayoutCancelled();
                            return;
                        }
                        PrintDocumentInfo pdi = new PrintDocumentInfo.Builder(jobNameEscaped)
                                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                                .build();
                        callback.onLayoutFinished(pdi, true);
                    }
                };
                
                printManager.print(jobNameEscaped, pda, new PrintAttributes.Builder().build());

            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(context, "Error printing PDF", Toast.LENGTH_SHORT).show());
            }
        }
    }
}
