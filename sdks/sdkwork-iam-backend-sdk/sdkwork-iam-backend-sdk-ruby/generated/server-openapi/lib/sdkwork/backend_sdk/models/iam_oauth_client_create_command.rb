module Sdkwork
  module BackendSdk
    module Models
      class IamOauthClientCreateCommand
              # Tenant-scoped OAuth provider client registration command.
              attr_accessor :integration_id, :provider_code, :client_code, :display_name, :provider_client_id, :provider_tenant_id

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @integration_id = attributes['integrationId']
                @provider_code = attributes['providerCode']
                @client_code = attributes['clientCode']
                @display_name = attributes['displayName']
                @provider_client_id = attributes['providerClientId']
                @provider_tenant_id = attributes['providerTenantId']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'integrationId' => @integration_id,
                  'providerCode' => @provider_code,
                  'clientCode' => @client_code,
                  'displayName' => @display_name,
                  'providerClientId' => @provider_client_id,
                  'providerTenantId' => @provider_tenant_id,
                }
              end
            end
    end
  end
end
