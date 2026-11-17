module Sdkwork
  module AppSdk
    module Models
      class WechatMiniProgramSessionCreateCommand
              # One-time WeChat Mini Program login-code exchange command.
              attr_accessor :js_code, :phone_code, :provider_code, :surface_code, :device_id

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @js_code = attributes['jsCode']
                @phone_code = attributes['phoneCode']
                @provider_code = attributes['providerCode']
                @surface_code = attributes['surfaceCode']
                @device_id = attributes['deviceId']
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'jsCode' => @js_code,
                  'phoneCode' => @phone_code,
                  'providerCode' => @provider_code,
                  'surfaceCode' => @surface_code,
                  'deviceId' => @device_id,
                }
              end
            end
    end
  end
end
