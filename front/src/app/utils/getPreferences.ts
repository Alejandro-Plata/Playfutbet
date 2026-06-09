import { Preferences } from "@capacitor/preferences";
import { TOKEN_KEY, USER_KEY } from "./consts";

export async function getToken() {
    const token = await Preferences.get({ key: TOKEN_KEY });
    if (token.value) {
        return token.value;
    }
    return null;
}

export async function getUser() {
    const user = await Preferences.get({ key: USER_KEY });
    if (user.value) {
        return JSON.parse(user.value);
    }
    return null;
}
