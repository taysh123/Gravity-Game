package com.truestorylabs.gravityflow;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Reads what the player actually chose in the UMP consent form (D-10, P00-T18).
 *
 * The UMP SDK stores the answer for every ad and analytics SDK as IAB TCF v2 keys in the app's DEFAULT SharedPreferences file
 * ("<package>_preferences"). No installed plugin can read that file: @capacitor/preferences reads its own "CapacitorStorage" file, and
 * the AdMob plugin only returns the consent STATUS and canRequestAds. canRequestAds is not the player's answer: after "Do not consent"
 * UMP still reports OBTAINED + canRequestAds = true (Google serves limited ads on legitimate interest) while IABTCF_PurposeConsents is
 * all zeros, so granting Firebase analytics from canRequestAds would grant it to players who refused. The JS side
 * (src/services/consentState.ts) maps these purposes to the four Firebase Consent Mode types.
 *
 * Read-only, no dependency (the default file name is built by hand instead of pulling in androidx.preference).
 * src/config/manifestConsent.test.ts pins the file name, the two keys and the registration in MainActivity.
 */
@CapacitorPlugin(name = "ConsentSignals")
public class ConsentSignalsPlugin extends Plugin {

    // PreferenceManager.getDefaultSharedPreferences(context) is the file named "<package name>_preferences".
    private static final String DEFAULT_PREFS_SUFFIX = "_preferences";
    private static final String KEY_GDPR_APPLIES = "IABTCF_gdprApplies";
    private static final String KEY_PURPOSE_CONSENTS = "IABTCF_PurposeConsents";

    @PluginMethod
    public void getTcf(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(context.getPackageName() + DEFAULT_PREFS_SUFFIX, Context.MODE_PRIVATE);
            JSObject result = new JSObject();
            // UMP writes gdprApplies as an Int; -1 = not stored (or stored as another type, which getInt rejects).
            int gdprApplies = -1;
            try {
                gdprApplies = prefs.getInt(KEY_GDPR_APPLIES, -1);
            } catch (ClassCastException ignored) {
                // an unexpected type is "not stored": the JS side then treats the answer as unverifiable
            }
            String purposeConsents = "";
            try {
                purposeConsents = prefs.getString(KEY_PURPOSE_CONSENTS, "");
            } catch (ClassCastException ignored) {
                // same: unreadable means unverifiable
            }
            result.put("gdprApplies", gdprApplies);
            result.put("purposeConsents", purposeConsents == null ? "" : purposeConsents);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not read the consent signals", e);
        }
    }
}
