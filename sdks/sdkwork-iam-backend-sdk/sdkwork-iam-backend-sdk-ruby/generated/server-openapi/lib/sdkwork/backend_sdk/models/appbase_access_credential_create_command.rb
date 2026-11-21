module Sdkwork
  module BackendSdk
    module Models
      class AppbaseAccessCredentialCreateCommand
              # Issue a delegated access credential for an enabled tenant application.
              attr_accessor :auth_token, :username, :email, :phone, :password, :tenant_id, :organization_id, :installation_id, :app_id, :instance_key, :ownership_scope

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @auth_token = attributes['authToken']
                @username = attributes['username']
                @email = attributes['email']
                @phone = attributes['phone']
                @password = attributes['password']
                @tenant_id = attributes['tenantId']
                @organization_id = attributes['organizationId']
                @installation_id = attributes['installationId']
                @app_id = attributes['appId']
                @instance_key = attributes['instanceKey']
                @ownership_scope = attributes['ownershipScope']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'authToken' => @auth_token,
                  'username' => @username,
                  'email' => @email,
                  'phone' => @phone,
                  'password' => @password,
                  'tenantId' => @tenant_id,
                  'organizationId' => @organization_id,
                  'installationId' => @installation_id,
                  'appId' => @app_id,
                  'instanceKey' => @instance_key,
                  'ownershipScope' => @ownership_scope,
                }
              end
            end
    end
  end
end
