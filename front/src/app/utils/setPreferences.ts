import { User, AuthResponse } from "../types/types";
import { Preferences } from "@capacitor/preferences";
import { TOKEN_KEY, USER_KEY } from "./consts";

export async function saveAuthData(authResponse: AuthResponse): Promise<void> {
    await Preferences.set({
        key: TOKEN_KEY,
        value: authResponse.token
    });

    await Preferences.set({
        key: USER_KEY,
        value: JSON.stringify(authResponse.user)
    });
}