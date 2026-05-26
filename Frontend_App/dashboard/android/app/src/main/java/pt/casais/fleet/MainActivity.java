package pt.casais.fleet;

import android.content.Intent;
import android.net.Uri;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.os.Parcelable;
import com.getcapacitor.BridgeActivity;

/**
 * Override MainActivity para garantir que intents NFC em warm start (app em segundo plano
 * a ser trazida para a frente por uma tag NFC) chegam ao JavaScript.
 *
 * O bridge default do Capacitor por vezes não dispara appUrlOpen para certos intents
 * (especialmente NDEF_DISCOVERED). Aqui extraímos o URL manualmente e injectamos um
 * evento customizado 'nfcUrl' no WebView. O App.jsx ouve esse evento como fallback.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        forwardNfcUrlIfAny(intent);
    }

    private void forwardNfcUrlIfAny(Intent intent) {
        if (intent == null) return;

        String url = null;

        // Caso 1: intent VIEW com data URI (Deep Link verificado por autoVerify)
        Uri data = intent.getData();
        if (data != null) {
            url = data.toString();
        }

        // Caso 2: NDEF_DISCOVERED — URL está dentro dos records NDEF
        if (url == null && NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction())) {
            Parcelable[] raw = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
            if (raw != null && raw.length > 0 && raw[0] instanceof NdefMessage) {
                NdefMessage msg = (NdefMessage) raw[0];
                for (NdefRecord rec : msg.getRecords()) {
                    Uri ru = rec.toUri();
                    if (ru != null) { url = ru.toString(); break; }
                }
            }
        }

        if (url == null || bridge == null) return;

        // Escapa apóstrofes para não quebrar o JS
        final String safeUrl = url.replace("\\", "\\\\").replace("'", "\\'");
        final String js = "window.dispatchEvent(new CustomEvent('nfcUrl', { detail: '" + safeUrl + "' }));";

        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(js, null));
    }
}
