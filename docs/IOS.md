# Kudi for iOS

The iOS app is the MVP web app (`public/`) inside a native shell built with [Capacitor](https://capacitorjs.com) 8. The Xcode project lives in `ios/App`.

## What's already set up

| Item | Where | Status |
|---|---|---|
| Bundle ID `app.kudi.pet`, name "Kudi", version 0.1.0 | `capacitor.config.json`, Xcode build settings | Done |
| iPhone only, portrait only, dark mode only | `Info.plist`, build settings | Done |
| Camera and photo library permission text (pet photo) | `Info.plist` | Done |
| URL scheme `app.kudi.pet` for the Google sign-in return | `Info.plist` | Done |
| Export compliance: no custom encryption | `Info.plist` (`ITSAppUsesNonExemptEncryption = NO`) | Done |
| Privacy manifest: email, name and user ID, for app functionality, no tracking | `ios/App/App/PrivacyInfo.xcprivacy` | Done |
| In-app account deletion | Settings, then Delete my account | Done on the phone; server side still to do (see below) |
| Public Privacy policy and Terms pages | `public/privacy.html`, `public/terms.html` (`npm run legal`) | Done; live once deployed |
| Google sign-in code (web and iOS) | `public/index.html`, `authGoogle` | Done; needs the setup below |
| Live Activity (Dynamic Island) code | `ios/App/KudiWidget`, `ios/App/Shared`, `ios/App/App/LiveActivityPlugin.swift` | Written, not compiled yet |
| App icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset` | **Placeholder** (the painted poodle) |

## Open it in Xcode

1. Install Xcode 16 or later from the Mac App Store, then run `sudo xcode-select -s /Applications/Xcode.app`.
2. In the project folder:
   ```bash
   npm install
   npm run ios:sync   # rebuilds the legal pages and copies public/ into the iOS project
   npm run ios:open   # opens ios/App in Xcode
   ```
3. In Xcode, select the **App** target. Under **Signing & Capabilities**, choose your team.
4. Pick an iPhone simulator and press Run.

Run `npm run ios:sync` again after every change to `public/`.

## Turn on Google sign-in

Right now the Supabase project only has email sign-in enabled, so the Google button shows "Google sign-in is not switched on yet". To turn it on:

1. **Google Cloud Console:**
   1. Go to APIs & Services, then Credentials.
   2. Create an OAuth client ID of type **Web application**.
   3. Add the Supabase callback as an authorised redirect URI: `https://uvnodtadnhypdkfodlse.supabase.co/auth/v1/callback`.
2. **Supabase:**
   1. Go to Authentication, then Providers, then **Google**.
   2. Turn it on and paste the client ID and secret.
3. **Supabase:**
   1. Go to Authentication, then URL Configuration.
   2. Set **Site URL** to `https://kudi-pi.vercel.app`.
   3. Add these redirect URLs:
      - `https://kudi-pi.vercel.app/`
      - `http://localhost:3000/`
      - `app.kudi.pet://auth`

On the web, Google sends the user back to the page. In the iOS app, it sends them to `app.kudi.pet://auth`, and the app exchanges the code for a session.

For testing on `localhost` only, the welcome screen shows "Skip sign-in (testing on this computer only)".

## Before submitting to the App Store

These are App Review requirements the MVP doesn't meet yet:

- **Sign in with Apple (Guideline 4.8).**
  - An app that offers Google sign-in must also offer an equally private option. Sign in with Apple is the usual one.
  - Supabase supports Apple as a provider, and the button sits next to Google on the welcome screen.
- **Account deletion must reach the server (Guideline 5.1.1(v)).**
  - Delete my account already clears the phone and signs out.
  - It must also delete the Supabase user. That needs a small server function using the service role key, called from the app.
- **Pawmates content (Guidelines 2.1 and 1.2).**
  - Pawmates shows sample profiles and scripted replies, so a reviewer would see them as placeholder content.
  - Chat between users also needs a way to report and block people.
  - For the first release, either connect it to real profiles with reporting and blocking, or show it as "Coming soon".
- **Reminders.**
  - Web notifications don't run inside the iOS app, so reminders only appear while Kudi is open.
  - Add `@capacitor/local-notifications` to schedule meal and medicine reminders that fire when the app is closed.
- **App icon and launch screen.**
  - Replace the placeholder icon with a final 1024 × 1024 PNG with no transparency.
  - Replace Capacitor's default splash image (`Splash.imageset`).
- **App Store Connect:**
  - Privacy policy URL: `https://kudi-pi.vercel.app/privacy.html`.
  - Support URL: needed.
  - App Privacy answers should match the privacy manifest: email address, name and user ID, all linked to the user, used for app functionality, no tracking.
  - Age rating.
  - Screenshots for 6.9" and 6.5" iPhones.

## Dynamic Island (Live Activity)

When a meal or dose is due within the hour, the app starts a Live Activity. It shows the mascot and a countdown on the Dynamic Island and the Lock Screen, then switches to "Late" once the time has passed.

The app side is already in the Xcode project:
- `LiveActivityPlugin.swift` and `MainViewController.swift`, which registers the plugin.
- `NSSupportsLiveActivities` in `Info.plist`.
- `syncLiveActivity()` in `public/index.html`.

The widget extension has to be added in Xcode once:

1. Choose File, then New, then Target, then **Widget Extension**. Name it `KudiWidget` and untick "Include Configuration App Intent". Keep or untick "Include Live Activity" (the template files get replaced in step 2).
2. Delete the template Swift files Xcode creates in the new `KudiWidget` group. Add `ios/App/KudiWidget/KudiLiveActivity.swift` to the **KudiWidget** target.
3. Add `ios/App/Shared/KudiActivityAttributes.swift` to the **KudiWidget** target as well. It's already in the App target.
4. In the widget's `Assets.xcassets`, add an image set named `KudiMascot` using `ios/App/KudiWidget/KudiMascot.jpg`. A small, simple mascot head reads best at Dynamic Island size; the painted poodle is a placeholder.
5. Set the widget's deployment target to iOS 16.2.
6. Test:
   1. Run on an iPhone 15 Pro (or later) simulator.
   2. Add a meal time 30 minutes from now, open Today and send the app to the background.
   3. The countdown appears in the Dynamic Island.

The colours in `KudiLiveActivity.swift` copy the app's dark tokens (`--color-ink`, `--color-ink-2`, `--color-primary`, `--color-danger`). If those tokens change, update the Swift colours to match.
