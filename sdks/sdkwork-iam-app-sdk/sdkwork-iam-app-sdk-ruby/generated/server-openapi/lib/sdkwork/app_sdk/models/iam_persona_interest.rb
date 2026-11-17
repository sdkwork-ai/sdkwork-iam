module Sdkwork
  module AppSdk
    module Models
      class IamPersonaInterest
              # One selectable interest direction.
              attr_accessor :code, :sort_order, :labels

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @code = attributes['code']
                @sort_order = attributes['sortOrder']
                @labels = attributes['labels'].is_a?(Hash) ? attributes['labels'].transform_values { |item| item } : {}
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'code' => @code,
                  'sortOrder' => @sort_order,
                  'labels' => @labels.is_a?(Hash) ? @labels.transform_values { |item| item } : {},
                }
              end
            end
    end
  end
end
