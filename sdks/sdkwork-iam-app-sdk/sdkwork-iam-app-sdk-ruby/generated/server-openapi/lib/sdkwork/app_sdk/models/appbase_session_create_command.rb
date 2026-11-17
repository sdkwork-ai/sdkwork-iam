module Sdkwork
  module AppSdk
    module Models
      class AppbaseSessionCreateCommand
              # Session creation command for credential login and external user-center session exchange.
              attr_accessor :grant_type, :account, :email, :username, :phone, :password, :external_token, :provider_key, :tenant_id, :organization_id, :device_id

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @grant_type = attributes['grantType']
                @account = attributes['account']
                @email = attributes['email']
                @username = attributes['username']
                @phone = attributes['phone']
                @password = attributes['password']
                @external_token = attributes['externalToken']
                @provider_key = attributes['providerKey']
                @tenant_id = attributes['tenantId']
                @organization_id = attributes['organizationId']
                @device_id = attributes['deviceId']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'grantType' => @grant_type,
                  'account' => @account,
                  'email' => @email,
                  'username' => @username,
                  'phone' => @phone,
                  'password' => @password,
                  'externalToken' => @external_token,
                  'providerKey' => @provider_key,
                  'tenantId' => @tenant_id,
                  'organizationId' => @organization_id,
                  'deviceId' => @device_id,
                }
              end
            end
    end
  end
end
