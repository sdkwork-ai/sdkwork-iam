module Sdkwork
  module BackendSdk
    module Models
      class IamTenantApplicationStatusCommand
              # Authenticated operator command for a tenant application status transition.
              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                # No properties to hydrate.
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  # No properties to serialize.
                }
              end
            end
    end
  end
end
