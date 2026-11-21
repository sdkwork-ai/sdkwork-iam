using System;
using SDKwork.Common.Core;
using SdkHttpClient = SDKWork.Iam.OpenSdk.Http.HttpClient;
using SDKWork.Iam.OpenSdk.Api;

namespace SDKWork.Iam.OpenSdk
{
    public class SdkworkCustomClient
    {
        private readonly SdkHttpClient _httpClient;



        public SdkworkCustomClient(string baseUrl)
        {
            _httpClient = new SdkHttpClient(baseUrl);

        }

        public SdkworkCustomClient(SdkConfig config)
        {
            _httpClient = new SdkHttpClient(config);

        }

        public SdkworkCustomClient SetApiKey(string apiKey)
        {
            _httpClient.SetApiKey(apiKey);
            return this;
        }

        public SdkworkCustomClient SetAuthToken(string token)
        {
            _httpClient.SetAuthToken(token);
            return this;
        }

        public SdkworkCustomClient SetAccessToken(string token)
        {
            _httpClient.SetAccessToken(token);
            return this;
        }

        public SdkworkCustomClient SetHeader(string key, string value)
        {
            _httpClient.SetHeader(key, value);
            return this;
        }
    }
}
