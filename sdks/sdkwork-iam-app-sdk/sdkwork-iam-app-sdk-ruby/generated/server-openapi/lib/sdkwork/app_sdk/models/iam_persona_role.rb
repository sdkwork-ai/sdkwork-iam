module Sdkwork
  module AppSdk
    module Models
      class IamPersonaRole
              # One selectable persona role.
              attr_accessor :code, :iam_role_code, :sort_order, :labels, :descriptions

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @code = attributes['code']
                @iam_role_code = attributes['iamRoleCode']
                @sort_order = attributes['sortOrder']
                @labels = attributes['labels'].is_a?(Hash) ? attributes['labels'].transform_values { |item| item } : {}
                @descriptions = attributes['descriptions'].is_a?(Hash) ? attributes['descriptions'].transform_values { |item| item } : {}
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'code' => @code,
                  'iamRoleCode' => @iam_role_code,
                  'sortOrder' => @sort_order,
                  'labels' => @labels.is_a?(Hash) ? @labels.transform_values { |item| item } : {},
                  'descriptions' => @descriptions.is_a?(Hash) ? @descriptions.transform_values { |item| item } : {},
                }
              end
            end
    end
  end
end
