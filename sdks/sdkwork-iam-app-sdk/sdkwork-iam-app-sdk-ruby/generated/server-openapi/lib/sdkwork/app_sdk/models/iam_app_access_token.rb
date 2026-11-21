module Sdkwork
  module AppSdk
    module Models
      class IamAppAccessToken
              # Signed application access credential. It is a session-class credential: it expires after one hour and can be revoked like any other IAM session.
              attr_accessor :access_token, :auth_token, :expires_at, :app_id, :installation_id, :organization_id, :ownership_scope, :session_id, :environment

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @access_token = attributes['accessToken']
                @auth_token = attributes['authToken']
                @expires_at = attributes['expiresAt']
                @app_id = attributes['appId']
                @installation_id = attributes['installationId']
                @organization_id = attributes['organizationId']
                @ownership_scope = attributes['ownershipScope']
                @session_id = attributes['sessionId']
                @environment = attributes['environment']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'accessToken' => @access_token,
                  'authToken' => @auth_token,
                  'expiresAt' => @expires_at,
                  'appId' => @app_id,
                  'installationId' => @installation_id,
                  'organizationId' => @organization_id,
                  'ownershipScope' => @ownership_scope,
                  'sessionId' => @session_id,
                  'environment' => @environment,
                }
              end
            end
    end
  end
end
