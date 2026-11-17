module Sdkwork
  module AppSdk
    module Models
      class DesktopSessionsCreateRequest
              # Native-app exchange of a deep-link authorization code for a dual-token session.
              attr_accessor :client_id, :authorization_code, :code_verifier, :redirect_uri, :client_secret, :device_id

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @client_id = attributes['clientId']
                @authorization_code = attributes['authorizationCode']
                @code_verifier = attributes['codeVerifier']
                @redirect_uri = attributes['redirectUri']
                @client_secret = attributes['clientSecret']
                @device_id = attributes['deviceId']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'clientId' => @client_id,
                  'authorizationCode' => @authorization_code,
                  'codeVerifier' => @code_verifier,
                  'redirectUri' => @redirect_uri,
                  'clientSecret' => @client_secret,
                  'deviceId' => @device_id,
                }
              end
            end
    end
  end
end
