module Sdkwork
  module AppSdk
    module Models
      class OauthPhoneBindingSessionCreateCommand
              # Completes a pending OAuth account association after the person proved ownership of the phone. Answered with the standard session payload, or with the `LOGIN_CONTEXT_SELECTION` challenge for an account that belongs to several organizations.
              attr_accessor :continuation_token, :phone, :verification_code, :surface_code, :device_id

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @continuation_token = attributes['continuationToken']
                @phone = attributes['phone']
                @verification_code = attributes['verificationCode']
                @surface_code = attributes['surfaceCode']
                @device_id = attributes['deviceId']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'continuationToken' => @continuation_token,
                  'phone' => @phone,
                  'verificationCode' => @verification_code,
                  'surfaceCode' => @surface_code,
                  'deviceId' => @device_id,
                }
              end
            end
    end
  end
end
