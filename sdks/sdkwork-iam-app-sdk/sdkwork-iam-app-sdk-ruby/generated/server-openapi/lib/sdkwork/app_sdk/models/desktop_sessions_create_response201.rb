module Sdkwork
  module AppSdk
    module Models
      class DesktopSessionsCreateResponse201
              attr_accessor :code, :trace_id, :data

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @code = attributes['code']
                @trace_id = attributes['traceId']
                @data = attributes['data'].is_a?(Hash) ? attributes['data'] : {}
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'code' => @code,
                  'traceId' => @trace_id,
                  'data' => @data,
                }
              end
            end
    end
  end
end
