require_relative 'base_api'
require_relative '../models/iam_app_access_token_create_command'
require_relative '../models/iam_app_access_token_response'
require_relative '../models/iam_organization_member_list_response'
require_relative '../models/iam_persona_catalog_response'
require_relative '../models/iam_user_persona_response'
require_relative '../models/iam_user_persona_update_command'
require_relative '../models/sdk_work_list_response'
require_relative '../models/sdk_work_resource_response'

module Sdkwork
  module AppSdk
    module Api
      class IamApi < BaseApi
          # App Access Tokens create.
          def app_access_tokens_create(body: nil)
            path = '/app/v3/api/iam/app_access_tokens'
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::IamAppAccessTokenResponse.from_hash(result) : nil
          end

          # Department Assignments list.
          def department_assignments_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil)
            path = '/app/v3/api/iam/department_assignments'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Departments list.
          def departments_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil)
            path = '/app/v3/api/iam/departments'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Departments tree retrieve.
          def departments_tree_retrieve()
            path = '/app/v3/api/iam/departments/tree'
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Oauth official Account Settings retrieve.
          def oauth_official_account_settings_retrieve()
            path = '/app/v3/api/iam/oauth/official_account_settings'
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Oauth official Accounts list.
          def oauth_official_accounts_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil)
            path = '/app/v3/api/iam/oauth/official_accounts'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Oauth official Accounts create.
          def oauth_official_accounts_create(body: nil)
            path = '/app/v3/api/iam/oauth/official_accounts'
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Oauth official Accounts delete.
          def oauth_official_accounts_delete(official_account_id)
            path = interpolate_path('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}', officialAccountId: serialize_path_parameter(official_account_id, PathParameterSpec.new('officialAccountId', 'simple', false)))
            options = {}

            result = @client.request('DELETE', path, **options)
            result
          end

          # Oauth official Accounts retrieve.
          def oauth_official_accounts_retrieve(official_account_id)
            path = interpolate_path('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}', officialAccountId: serialize_path_parameter(official_account_id, PathParameterSpec.new('officialAccountId', 'simple', false)))
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Oauth official Accounts update.
          def oauth_official_accounts_update(official_account_id, body: nil)
            path = interpolate_path('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}', officialAccountId: serialize_path_parameter(official_account_id, PathParameterSpec.new('officialAccountId', 'simple', false)))
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('PATCH', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Oauth official Accounts custom Menus publish.
          def oauth_official_accounts_custom_menus_publish(official_account_id, body: nil)
            path = interpolate_path('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}/custom_menus/publish', officialAccountId: serialize_path_parameter(official_account_id, PathParameterSpec.new('officialAccountId', 'simple', false)))
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Oauth official Accounts custom Menus rollback.
          def oauth_official_accounts_custom_menus_rollback(official_account_id, body: nil)
            path = interpolate_path('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}/custom_menus/rollback', officialAccountId: serialize_path_parameter(official_account_id, PathParameterSpec.new('officialAccountId', 'simple', false)))
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Oauth official Accounts custom Menus sync.
          def oauth_official_accounts_custom_menus_sync(official_account_id, body: nil)
            path = interpolate_path('/app/v3/api/iam/oauth/official_accounts/{officialAccountId}/custom_menus/sync', officialAccountId: serialize_path_parameter(official_account_id, PathParameterSpec.new('officialAccountId', 'simple', false)))
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Organization Memberships list.
          def organization_memberships_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil)
            path = '/app/v3/api/iam/organization_memberships'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Organizations list.
          def organizations_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil)
            path = '/app/v3/api/iam/organizations'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Organizations members list.
          def organizations_members_list(organization_id, page: nil, page_size: nil, cursor: nil, sort: nil, q: nil, role: nil)
            path = interpolate_path('/app/v3/api/iam/organizations/{organizationId}/members', organizationId: serialize_path_parameter(organization_id, PathParameterSpec.new('organizationId', 'simple', false)))
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
              QueryParameterSpec.new('role', role, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::IamOrganizationMemberListResponse.from_hash(result) : nil
          end

          # Organizations tree retrieve.
          def organizations_tree_retrieve()
            path = '/app/v3/api/iam/organizations/tree'
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Persona Catalog retrieve.
          def persona_catalog_retrieve()
            path = '/app/v3/api/iam/persona_catalog'
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::IamPersonaCatalogResponse.from_hash(result) : nil
          end

          # Position Assignments list.
          def position_assignments_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil)
            path = '/app/v3/api/iam/position_assignments'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Positions list.
          def positions_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil)
            path = '/app/v3/api/iam/positions'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Role Bindings list.
          def role_bindings_list(page: nil, page_size: nil, cursor: nil, sort: nil, q: nil, role_id: nil, principal_kind: nil, principal_id: nil, scope_kind: nil, scope_id: nil)
            path = '/app/v3/api/iam/role_bindings'
            query = build_query_string([
              QueryParameterSpec.new('page', page, 'form', true, false, nil),
              QueryParameterSpec.new('page_size', page_size, 'form', true, false, nil),
              QueryParameterSpec.new('cursor', cursor, 'form', true, false, nil),
              QueryParameterSpec.new('sort', sort, 'form', true, false, nil),
              QueryParameterSpec.new('q', q, 'form', true, false, nil),
              QueryParameterSpec.new('role_id', role_id, 'form', true, false, nil),
              QueryParameterSpec.new('principal_kind', principal_kind, 'form', true, false, nil),
              QueryParameterSpec.new('principal_id', principal_id, 'form', true, false, nil),
              QueryParameterSpec.new('scope_kind', scope_kind, 'form', true, false, nil),
              QueryParameterSpec.new('scope_id', scope_id, 'form', true, false, nil),
            ])
            path = append_query_string(path, query)
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkListResponse.from_hash(result) : nil
          end

          # Users current retrieve.
          def users_current_retrieve()
            path = '/app/v3/api/iam/users/current'
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Users current update.
          def users_current_update(body: nil)
            path = '/app/v3/api/iam/users/current'
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('PATCH', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Users current email Bindings delete.
          def users_current_email_bindings_delete()
            path = '/app/v3/api/iam/users/current/email_bindings'
            options = {}

            result = @client.request('DELETE', path, **options)
            result
          end

          # Users current email Bindings create.
          def users_current_email_bindings_create(body: nil)
            path = '/app/v3/api/iam/users/current/email_bindings'
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Users current password update.
          def users_current_password_update(body: nil)
            path = '/app/v3/api/iam/users/current/password'
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('PATCH', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

          # Users current persona delete.
          def users_current_persona_delete()
            path = '/app/v3/api/iam/users/current/persona'
            options = {}

            result = @client.request('DELETE', path, **options)
            result
          end

          # Users current persona retrieve.
          def users_current_persona_retrieve()
            path = '/app/v3/api/iam/users/current/persona'
            options = {}

            result = @client.request('GET', path, **options)
            result.is_a?(Hash) ? Models::IamUserPersonaResponse.from_hash(result) : nil
          end

          # Users current persona update.
          def users_current_persona_update(body: nil)
            path = '/app/v3/api/iam/users/current/persona'
            payload = body.respond_to?(:to_hash) ? body.to_hash : body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('PUT', path, **options)
            result.is_a?(Hash) ? Models::IamUserPersonaResponse.from_hash(result) : nil
          end

          # Users current phone Bindings delete.
          def users_current_phone_bindings_delete()
            path = '/app/v3/api/iam/users/current/phone_bindings'
            options = {}

            result = @client.request('DELETE', path, **options)
            result
          end

          # Users current phone Bindings create.
          def users_current_phone_bindings_create(body: nil)
            path = '/app/v3/api/iam/users/current/phone_bindings'
            payload = body
            options = {}
            options[:json] = payload unless payload.nil?
            result = @client.request('POST', path, **options)
            result.is_a?(Hash) ? Models::SdkWorkResourceResponse.from_hash(result) : nil
          end

      end
    end
  end
end
