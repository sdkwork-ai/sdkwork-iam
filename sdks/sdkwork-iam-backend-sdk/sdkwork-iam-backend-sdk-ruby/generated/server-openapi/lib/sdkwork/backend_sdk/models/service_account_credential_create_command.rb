module Sdkwork
  module BackendSdk
    module Models
      class ServiceAccountCredentialCreateCommand
              # Create a one-time-returned workload credential bound to a service account and tenant application.
              attr_accessor :tenant_application_id, :expires_at

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @tenant_application_id = attributes['tenantApplicationId']
                @expires_at = attributes['expiresAt']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'tenantApplicationId' => @tenant_application_id,
                  'expiresAt' => @expires_at,
                }
              end
            end
    end
  end
end
