import 'src/http/client.dart';
import 'src/http/sdk_config.dart';
import 'src/api/auth.dart';
import 'src/api/iam.dart';
import 'src/api/oauth.dart';
import 'src/api/system.dart';

class SdkworkIamAppClient {
  final HttpClient _httpClient;

  late final AuthApi auth;
  late final IamApi iam;
  late final OauthApi oauth;
  late final SystemApi system;

  SdkworkIamAppClient({
    required SdkConfig config,
  }) : _httpClient = HttpClient(config: config) {
    auth = AuthApi(_httpClient);
    iam = IamApi(_httpClient);
    oauth = OauthApi(_httpClient);
    system = SystemApi(_httpClient);
  }

  factory SdkworkIamAppClient.withBaseUrl({
    required String baseUrl,
    String? apiKey,
    String? authToken,
    String? accessToken,
    String apiKeyHeader = 'Access-Token',
    bool apiKeyAsBearer = false,
    Map<String, String>? headers,
    int timeout = 30000,
  }) {
    return SdkworkIamAppClient(
      config: SdkConfig(
        baseUrl: baseUrl,
        timeout: timeout,
        headers: headers ?? const {},
        apiKey: apiKey,
        apiKeyHeader: apiKeyHeader,
        apiKeyAsBearer: apiKeyAsBearer,
        authToken: authToken,
        accessToken: accessToken,
      ),
    );
  }

  void setApiKey(String apiKey) {
    _httpClient.setApiKey(apiKey);
  }

  void setAuthToken(String token) {
    _httpClient.setAuthToken(token);
  }

  void setAccessToken(String token) {
    _httpClient.setAccessToken(token);
  }

  void setHeader(String key, String value) {
    _httpClient.setHeader(key, value);
  }

  void close() {
    _httpClient.close();
  }
}
