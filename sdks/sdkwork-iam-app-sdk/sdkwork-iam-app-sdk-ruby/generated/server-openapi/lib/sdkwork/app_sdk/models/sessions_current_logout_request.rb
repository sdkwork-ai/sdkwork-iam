module Sdkwork
  module AppSdk
    module Models
      class SessionsCurrentLogoutRequest
              attr_accessor :refresh_token

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @refresh_token = attributes['refreshToken']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'refreshToken' => @refresh_token,
                }
              end
            end
    end
  end
end
