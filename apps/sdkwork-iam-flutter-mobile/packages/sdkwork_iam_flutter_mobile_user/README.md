# sdkwork_iam_flutter_mobile_user

Flutter user-center capability for IAM: current-user profile retrieval and update, and optional password change.

## Exports

- `IamFlutterMobileUserProfileController`
- `IamFlutterMobileUserRouteManifest`

## The Me page

`IamFlutterMobileUserMeScreen` renders the user-center "Me" capability (hero, session context card, menu, sign-out, loading/error states) from injected collaborators, with the same `iam.userCenter.me.*` message keys and screen ids as the cross-architecture headless core.
