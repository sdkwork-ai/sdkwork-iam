module Sdkwork
  module BackendSdk
    module Models
      class ServiceAccountTokenExchangeCommand
              # Exchange a workload client credential for short-lived tenant-bound dual tokens.
              attr_accessor :client_id, :client_secret

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @client_id = attributes['clientId']
                @client_secret = attributes['clientSecret']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'clientId' => @client_id,
                  'clientSecret' => @client_secret,
                }
              end
            end
    end
  end
end
