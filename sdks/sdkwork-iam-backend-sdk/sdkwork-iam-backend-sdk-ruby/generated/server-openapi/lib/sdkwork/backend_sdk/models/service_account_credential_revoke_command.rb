module Sdkwork
  module BackendSdk
    module Models
      class ServiceAccountCredentialRevokeCommand
              # Revoke a workload credential and all sessions issued from it.
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
