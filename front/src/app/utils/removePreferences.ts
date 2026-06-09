import { Preferences } from "@capacitor/preferences";
import { TOKEN_KEY, USER_KEY } from "./consts";

export async function removePreferences() {
    await Preferences.remove({
        key: TOKEN_KEY
    });
    await Preferences.remove({
        key: USER_KEY
    });
}