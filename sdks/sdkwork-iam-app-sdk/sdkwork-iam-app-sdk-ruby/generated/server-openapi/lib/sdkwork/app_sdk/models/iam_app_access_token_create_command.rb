module Sdkwork
  module AppSdk
    module Models
      class IamAppAccessTokenCreateCommand
              # Selectors for the application whose access credential is requested. Supply at least one; the tenant and the organization are derived from the authenticated session and the installation, never from this body.
              attr_accessor :app_id, :installation_id, :instance_key, :environment, :ownership_scope

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @app_id = attributes['appId']
                @installation_id = attributes['installationId']
                @instance_key = attributes['instanceKey']
                @environment = attributes['environment']
                @ownership_scope = attributes['ownershipScope']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'appId' => @app_id,
                  'installationId' => @installation_id,
                  'instanceKey' => @instance_key,
                  'environment' => @environment,
                  'ownershipScope' => @ownership_scope,
                }
              end
            end
    end
  end
end
