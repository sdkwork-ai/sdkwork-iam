module Sdkwork
  module AppSdk
    module Models
      class IamPersonaCatalog
              # The selectable persona taxonomy with every active locale.
              attr_accessor :version, :roles, :interests

              def initialize(attributes = {})
                attributes = (attributes || {}).transform_keys(&:to_s)
                @version = attributes['version']
                @roles = attributes['roles'].is_a?(Array) ? attributes['roles'].map { |item| item.is_a?(Hash) ? IamPersonaRole.from_hash(item) : item } : []
                @interests = attributes['interests'].is_a?(Array) ? attributes['interests'].map { |item| item.is_a?(Hash) ? IamPersonaInterest.from_hash(item) : item } : []
              end

              def self.from_hash(data)
                return nil if data.nil?

                new(data)
              end

              def to_hash
                {
                  'version' => @version,
                  'roles' => @roles.is_a?(Array) ? @roles.map { |item| item.respond_to?(:to_hash) ? item.to_hash : item } : [],
                  'interests' => @interests.is_a?(Array) ? @interests.map { |item| item.respond_to?(:to_hash) ? item.to_hash : item } : [],
                }
              end
            end
    end
  end
end
