module Sdkwork
  module BackendSdk
    module Models
      class IamInstallationCredentialRotateCommand
              # Rotates the active credential: the replacement becomes active with a new client id and secret, and the predecessor is kept as rotated history.
              attr_accessor :client_id

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @client_id = attributes['clientId']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'clientId' => @client_id,
                }
              end
            end
    end
  end
end
