import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AppbaseAccessCredentialCreateCommand, AppbaseInstallationEnableCommand, AppbaseInstallationProvisionCommand, AppbaseInstallationUpdateCommand, AppbaseOperationCommand, IamEnterpriseOrder, IamEnterpriseOrderCreateCommand, IamEnterpriseOrderEvent, IamEnterpriseOrderLinkConfirmCommand, IamEnterpriseOrderSeat, IamEnterpriseOrderTerminateCommand, IamEnterpriseOrderUpdateCommand, IamEnterpriseOrderWithLink, IamEnterpriseSeatAssignCommand, IamEnterpriseSeatBlacklistCommand, IamEnterpriseSeatBlacklistEntry, IamEnterpriseSeatBulkReleaseCommand, IamEnterpriseSeatExportCommand, IamEnterpriseSeatPolicy, IamEnterpriseSeatPolicyCommand, IamEnterpriseSeatPolicyUpdateCommand, IamInstallationCredential, IamInstallationCredentialCreateCommand, IamInstallationCredentialPolicyUpdateCommand, IamInstallationCredentialRotateCommand, IamInstallationCredentialWithSecret, IamInstallationEnvironment, IamInstallationEnvironmentUpsertCommand, IamInstallationManagementProvisionCommand, IamInstallationManagementUpdateCommand, IamInstallationStatusCommand, IamOrganizationMembership, IamPermissionResource, IamRoleBinding, IamRoleBindingUpdateCommand, PageInfo, SdkWorkCommandData, SdkWorkPageData, ServiceAccountCredentialCreateCommand, ServiceAccountCredentialRevokeCommand, ServiceAccountTokenExchangeCommand } from '../types';


export interface IamUsersListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  status?: string;
}

export class IamUsersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Users list. */
  async list(params?: IamUsersListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/users`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Users create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/users`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Users delete. */
  async delete(userId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/users/${serializePathParameter(userId, { name: 'userId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Users retrieve. */
  async retrieve(userId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/users/${serializePathParameter(userId, { name: 'userId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Users update. */
  async update(userId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/users/${serializePathParameter(userId, { name: 'userId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }

/** Users ban. */
  async ban(userId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/users/${serializePathParameter(userId, { name: 'userId', style: 'simple', explode: false })}/ban`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Users unban. */
  async unban(userId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/users/${serializePathParameter(userId, { name: 'userId', style: 'simple', explode: false })}/unban`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface IamEnterpriseSeatsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  status?: 'active' | 'released';
}

export class IamEnterpriseSeatsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Enterprise Seats list. */
  async list(tenantId: string, orderId: string, params?: IamEnterpriseSeatsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamEnterpriseOrderSeat[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamEnterpriseOrderSeat[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seats`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Enterprise Seats create. */
  async create(tenantId: string, orderId: string, body: IamEnterpriseSeatAssignCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrder> {
    return this.client.request<IamEnterpriseOrder>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seats`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Seats delete. */
  async delete(tenantId: string, orderId: string, seatId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seats/${serializePathParameter(seatId, { name: 'seatId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Enterprise Seats bulk Release. */
  async bulkRelease(tenantId: string, orderId: string, body: IamEnterpriseSeatBulkReleaseCommand, requestOptions?: ApiRequestOptions): Promise<{ items: { seatId: string; success: boolean; }[]; allOrNothing: true; }> {
    return this.client.request<{ items: { seatId: string; success: boolean; }[]; allOrNothing: true; }>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seats/bulk_release`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }

/** Enterprise Seats export. */
  async export(tenantId: string, orderId: string, body: IamEnterpriseSeatExportCommand, requestOptions?: ApiRequestOptions): Promise<{ fileName: string; csv: string; }> {
    return this.client.request<{ fileName: string; csv: string; }>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seats/export`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface IamEnterpriseSeatPoliciesListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export interface IamEnterpriseSeatPoliciesDeleteParams {
  disposition?: 'release' | 'keep';
}

export class IamEnterpriseSeatPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Enterprise Seat Policies list. */
  async list(tenantId: string, orderId: string, params?: IamEnterpriseSeatPoliciesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamEnterpriseSeatPolicy[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamEnterpriseSeatPolicy[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_policies`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Enterprise Seat Policies create. */
  async create(tenantId: string, orderId: string, body: IamEnterpriseSeatPolicyCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseSeatPolicy> {
    return this.client.request<IamEnterpriseSeatPolicy>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_policies`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Seat Policies delete. */
  async delete(tenantId: string, orderId: string, policyId: string, params?: IamEnterpriseSeatPoliciesDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const query = buildQueryString([
      { name: 'disposition', value: params?.disposition, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<void>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Enterprise Seat Policies retrieve. */
  async retrieve(tenantId: string, orderId: string, policyId: string, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseSeatPolicy> {
    return this.client.request<IamEnterpriseSeatPolicy>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Seat Policies update. */
  async update(tenantId: string, orderId: string, policyId: string, body?: IamEnterpriseSeatPolicyUpdateCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseSeatPolicy> {
    return this.client.request<IamEnterpriseSeatPolicy>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamEnterpriseSeatBlacklistListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamEnterpriseSeatBlacklistApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Enterprise Seat Blacklist list. */
  async list(tenantId: string, orderId: string, params?: IamEnterpriseSeatBlacklistListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamEnterpriseSeatBlacklistEntry[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamEnterpriseSeatBlacklistEntry[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_blacklist`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Enterprise Seat Blacklist create. */
  async create(tenantId: string, orderId: string, body: IamEnterpriseSeatBlacklistCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseSeatBlacklistEntry> {
    return this.client.request<IamEnterpriseSeatBlacklistEntry>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_blacklist`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Seat Blacklist delete. */
  async delete(tenantId: string, orderId: string, entryId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/seat_blacklist/${serializePathParameter(entryId, { name: 'entryId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }
}

export interface IamEnterpriseGrantsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  authorizationMode?: 'all_members' | 'seat';
}

export class IamEnterpriseGrantsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Enterprise Grants list. */
  async list(tenantId: string, params?: IamEnterpriseGrantsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamEnterpriseOrder[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'authorization_mode', value: params?.authorizationMode, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamEnterpriseOrder[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export class IamEnterpriseOrderTerminationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Enterprise Order Terminations create. */
  async create(tenantId: string, body: IamEnterpriseOrderLinkConfirmCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrder> {
    return this.client.request<IamEnterpriseOrder>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_order_terminations`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class IamEnterpriseOrderAuthorizationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Enterprise Order Authorizations create. */
  async create(tenantId: string, body: IamEnterpriseOrderLinkConfirmCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrder> {
    return this.client.request<IamEnterpriseOrder>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_order_authorizations`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class IamPublisherEnterpriseOrdersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Publisher Enterprise Orders retrieve. */
  async retrieve(tenantId: string, applicationId: string, orderId: string, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrder> {
    return this.client.request<IamEnterpriseOrder>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamEnterpriseOrdersEventsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamEnterpriseOrdersEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Enterprise Orders events list. */
  async list(tenantId: string, applicationId: string, orderId: string, params?: IamEnterpriseOrdersEventsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamEnterpriseOrderEvent[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamEnterpriseOrderEvent[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/events`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export interface IamEnterpriseOrdersListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamEnterpriseOrdersApi {
  private client: HttpClient;
  public readonly events: IamEnterpriseOrdersEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.events = new IamEnterpriseOrdersEventsApi(client);
  }


/** Enterprise Orders list. */
  async list(tenantId: string, applicationId: string, params?: IamEnterpriseOrdersListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamEnterpriseOrder[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamEnterpriseOrder[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/enterprise_orders`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Enterprise Orders create. */
  async create(tenantId: string, applicationId: string, body: IamEnterpriseOrderCreateCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrderWithLink> {
    return this.client.request<IamEnterpriseOrderWithLink>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/enterprise_orders`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Orders cancel. */
  async cancel(tenantId: string, applicationId: string, orderId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrder> {
    return this.client.request<IamEnterpriseOrder>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancel`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Orders terminate. */
  async terminate(tenantId: string, applicationId: string, orderId: string, body: IamEnterpriseOrderTerminateCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrderWithLink> {
    return this.client.request<IamEnterpriseOrderWithLink>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/applications/${serializePathParameter(applicationId, { name: 'applicationId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/terminate`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Orders retrieve. */
  async retrieve(tenantId: string, orderId: string, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrder> {
    return this.client.request<IamEnterpriseOrder>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Enterprise Orders update. */
  async update(tenantId: string, orderId: string, body?: IamEnterpriseOrderUpdateCommand, requestOptions?: ApiRequestOptions): Promise<IamEnterpriseOrder> {
    return this.client.request<IamEnterpriseOrder>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/enterprise_orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamTenantsMembersListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamTenantsMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Tenants members list. */
  async list(tenantId: string, params?: IamTenantsMembersListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/members`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Tenants members create. */
  async create(tenantId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/members`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Tenants members delete. */
  async delete(tenantId: string, userId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/members/${serializePathParameter(userId, { name: 'userId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Tenants members update. */
  async update(tenantId: string, userId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/members/${serializePathParameter(userId, { name: 'userId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamTenantsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamTenantsApi {
  private client: HttpClient;
  public readonly members: IamTenantsMembersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.members = new IamTenantsMembersApi(client);
  }


/** Tenants list. */
  async list(params?: IamTenantsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/tenants`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Tenants create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Tenants delete. */
  async delete(tenantId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Tenants retrieve. */
  async retrieve(tenantId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Tenants update. */
  async update(tenantId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export class IamServiceAccountsCredentialsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Accounts credentials create. */
  async create(serviceAccountId: string, body: ServiceAccountCredentialCreateCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/service_accounts/${serializePathParameter(serviceAccountId, { name: 'serviceAccountId', style: 'simple', explode: false })}/credentials`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface IamServiceAccountsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamServiceAccountsApi {
  private client: HttpClient;
  public readonly credentials: IamServiceAccountsCredentialsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.credentials = new IamServiceAccountsCredentialsApi(client);
  }


/** Service Accounts list. */
  async list(params?: IamServiceAccountsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/service_accounts`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Service Accounts create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/service_accounts`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Service Accounts delete. */
  async delete(serviceAccountId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/service_accounts/${serializePathParameter(serviceAccountId, { name: 'serviceAccountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Service Accounts retrieve. */
  async retrieve(serviceAccountId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/service_accounts/${serializePathParameter(serviceAccountId, { name: 'serviceAccountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Service Accounts update. */
  async update(serviceAccountId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/service_accounts/${serializePathParameter(serviceAccountId, { name: 'serviceAccountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export class IamServiceAccountTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Account Tokens create. */
  async create(body: ServiceAccountTokenExchangeCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/service_account_tokens`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', skipAuth: true, sdkworkUnwrapKind: 'item' });
  }
}

export class IamServiceAccountCredentialsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Account Credentials revoke. */
  async revoke(credentialId: string, body: ServiceAccountCredentialRevokeCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/service_account_credentials/${serializePathParameter(credentialId, { name: 'credentialId', style: 'simple', explode: false })}/revoke`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'command' });
  }
}

export interface IamSecurityEventsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamSecurityEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Security Events list. */
  async list(params?: IamSecurityEventsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/security_events`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Security Events retrieve. */
  async retrieve(securityEventId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/security_events/${serializePathParameter(securityEventId, { name: 'securityEventId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamRolesPermissionsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  resource?: string;
}

export class IamRolesPermissionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Roles permissions list. */
  async list(roleId: string, params?: IamRolesPermissionsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'resource', value: params?.resource, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/roles/${serializePathParameter(roleId, { name: 'roleId', style: 'simple', explode: false })}/permissions`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Roles permissions create. */
  async create(roleId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/roles/${serializePathParameter(roleId, { name: 'roleId', style: 'simple', explode: false })}/permissions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Roles permissions delete. */
  async delete(roleId: string, permissionId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/roles/${serializePathParameter(roleId, { name: 'roleId', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }
}

export interface IamRolesListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamRolesApi {
  private client: HttpClient;
  public readonly permissions: IamRolesPermissionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.permissions = new IamRolesPermissionsApi(client);
  }


/** Roles list. */
  async list(params?: IamRolesListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/roles`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Roles create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/roles`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Roles delete. */
  async delete(roleId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/roles/${serializePathParameter(roleId, { name: 'roleId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Roles retrieve. */
  async retrieve(roleId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/roles/${serializePathParameter(roleId, { name: 'roleId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Roles update. */
  async update(roleId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/roles/${serializePathParameter(roleId, { name: 'roleId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamRoleBindingsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  roleId?: string;
  principalKind?: string;
  principalId?: string;
  scopeKind?: string;
  scopeId?: string;
}

export class IamRoleBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Role Bindings list. */
  async list(params?: IamRoleBindingsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamRoleBinding[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'role_id', value: params?.roleId, style: 'form', explode: true, allowReserved: false },
      { name: 'principal_kind', value: params?.principalKind, style: 'form', explode: true, allowReserved: false },
      { name: 'principal_id', value: params?.principalId, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_kind', value: params?.scopeKind, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamRoleBinding[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/role_bindings`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Role Bindings create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<IamRoleBinding> {
    return this.client.request<IamRoleBinding>(backendApiPath(`/iam/role_bindings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Role Bindings delete. */
  async delete(roleBindingId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/role_bindings/${serializePathParameter(roleBindingId, { name: 'roleBindingId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Role Bindings update. */
  async update(roleBindingId: string, body?: IamRoleBindingUpdateCommand, requestOptions?: ApiRequestOptions): Promise<IamRoleBinding> {
    return this.client.request<IamRoleBinding>(backendApiPath(`/iam/role_bindings/${serializePathParameter(roleBindingId, { name: 'roleBindingId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export class IamProviderCredentialsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Provider Credentials revoke. */
  async revoke(credentialId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/provider_credentials/${serializePathParameter(credentialId, { name: 'credentialId', style: 'simple', explode: false })}/revoke`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'command' });
  }
}

export class IamProviderAccountsResolveApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Provider Accounts resolve retrieve. */
  async retrieve(requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/provider_accounts/resolve`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export class IamProviderAccountsCredentialsRevealApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Provider Accounts credentials reveal retrieve. */
  async retrieve(providerAccountId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}/credentials/reveal`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamProviderAccountsCredentialsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamProviderAccountsCredentialsApi {
  private client: HttpClient;
  public readonly reveal: IamProviderAccountsCredentialsRevealApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.reveal = new IamProviderAccountsCredentialsRevealApi(client);
  }


/** Provider Accounts credentials list. */
  async list(providerAccountId: string, params?: IamProviderAccountsCredentialsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}/credentials`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Provider Accounts credentials create. */
  async create(providerAccountId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}/credentials`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface IamProviderAccountsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  vendorCode?: string;
  scopeType?: string;
  ownerUserId?: string;
  organizationId?: string;
  status?: string;
  mine?: boolean;
  includePlatform?: boolean;
}

export class IamProviderAccountsApi {
  private client: HttpClient;
  public readonly credentials: IamProviderAccountsCredentialsApi;
  public readonly resolve: IamProviderAccountsResolveApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.credentials = new IamProviderAccountsCredentialsApi(client);
    this.resolve = new IamProviderAccountsResolveApi(client);
  }


/** Provider Accounts list. */
  async list(params?: IamProviderAccountsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'vendor_code', value: params?.vendorCode, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'owner_user_id', value: params?.ownerUserId, style: 'form', explode: true, allowReserved: false },
      { name: 'organization_id', value: params?.organizationId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'mine', value: params?.mine, style: 'form', explode: true, allowReserved: false },
      { name: 'include_platform', value: params?.includePlatform, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/provider_accounts`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Provider Accounts create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/provider_accounts`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Provider Accounts delete. */
  async delete(providerAccountId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Provider Accounts retrieve. */
  async retrieve(providerAccountId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Provider Accounts update. */
  async update(providerAccountId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }

/** Provider Accounts default. */
  async default(providerAccountId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}/default`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface IamPositionsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamPositionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Positions list. */
  async list(params?: IamPositionsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/positions`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Positions create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/positions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Positions delete. */
  async delete(positionId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/positions/${serializePathParameter(positionId, { name: 'positionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Positions update. */
  async update(positionId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/positions/${serializePathParameter(positionId, { name: 'positionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamPositionAssignmentsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamPositionAssignmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Position Assignments list. */
  async list(params?: IamPositionAssignmentsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/position_assignments`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Position Assignments create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/position_assignments`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Position Assignments update. */
  async update(assignmentId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/position_assignments/${serializePathParameter(assignmentId, { name: 'assignmentId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamPoliciesListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Policies list. */
  async list(params?: IamPoliciesListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/policies`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Policies create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/policies`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Policies delete. */
  async delete(policyId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Policies retrieve. */
  async retrieve(policyId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Policies update. */
  async update(policyId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamPermissionsResourcesListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamPermissionsResourcesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Permissions resources list. */
  async list(params?: IamPermissionsResourcesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamPermissionResource[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamPermissionResource[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/permissions/resources`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export interface IamPermissionsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  resource?: string;
  roleId?: string;
  assigned?: boolean;
}

export class IamPermissionsApi {
  private client: HttpClient;
  public readonly resources: IamPermissionsResourcesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.resources = new IamPermissionsResourcesApi(client);
  }


/** Permissions list. */
  async list(params?: IamPermissionsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'resource', value: params?.resource, style: 'form', explode: true, allowReserved: false },
      { name: 'role_id', value: params?.roleId, style: 'form', explode: true, allowReserved: false },
      { name: 'assigned', value: params?.assigned, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/permissions`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Permissions create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/permissions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Permissions delete. */
  async delete(permissionId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Permissions retrieve. */
  async retrieve(permissionId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Permissions update. */
  async update(permissionId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export class IamOrganizationsTreeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Organizations tree retrieve. */
  async retrieve(requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/organizations/tree`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamOrganizationsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamOrganizationsApi {
  private client: HttpClient;
  public readonly tree: IamOrganizationsTreeApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.tree = new IamOrganizationsTreeApi(client);
  }


/** Organizations list. */
  async list(params?: IamOrganizationsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/organizations`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Organizations create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/organizations`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Organizations delete. */
  async delete(organizationId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/organizations/${serializePathParameter(organizationId, { name: 'organizationId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Organizations retrieve. */
  async retrieve(organizationId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/organizations/${serializePathParameter(organizationId, { name: 'organizationId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Organizations update. */
  async update(organizationId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/organizations/${serializePathParameter(organizationId, { name: 'organizationId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamOrganizationMembershipsRosterListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  organizationId?: string;
  departmentId?: string;
  includeDescendants?: boolean;
}

export class IamOrganizationMembershipsRosterApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Organization Memberships roster list. */
  async list(params?: IamOrganizationMembershipsRosterListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'organization_id', value: params?.organizationId, style: 'form', explode: true, allowReserved: false },
      { name: 'department_id', value: params?.departmentId, style: 'form', explode: true, allowReserved: false },
      { name: 'include_descendants', value: params?.includeDescendants, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/organization_memberships/roster`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export class IamOrganizationMembershipsDepartmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Organization Memberships departments update. */
  async update(membershipId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/organization_memberships/${serializePathParameter(membershipId, { name: 'membershipId', style: 'simple', explode: false })}/departments`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface IamOrganizationMembershipsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  organizationId?: string;
  departmentId?: string;
}

export class IamOrganizationMembershipsApi {
  private client: HttpClient;
  public readonly departments: IamOrganizationMembershipsDepartmentsApi;
  public readonly roster: IamOrganizationMembershipsRosterApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.departments = new IamOrganizationMembershipsDepartmentsApi(client);
    this.roster = new IamOrganizationMembershipsRosterApi(client);
  }


/** Organization Memberships list. */
  async list(params?: IamOrganizationMembershipsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamOrganizationMembership[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'organization_id', value: params?.organizationId, style: 'form', explode: true, allowReserved: false },
      { name: 'department_id', value: params?.departmentId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamOrganizationMembership[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/organization_memberships`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Organization Memberships create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/organization_memberships`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Organization Memberships update. */
  async update(membershipId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/organization_memberships/${serializePathParameter(membershipId, { name: 'membershipId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export class IamInstallationsSummaryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Installations summary retrieve. */
  async retrieve(tenantId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/summary`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamInstallationsEnvironmentsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamInstallationsEnvironmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Installations environments list. */
  async list(tenantId: string, installationId: string, params?: IamInstallationsEnvironmentsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamInstallationEnvironment[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamInstallationEnvironment[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/environments`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Installations environments delete. */
  async delete(tenantId: string, installationId: string, environmentKey: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/environments/${serializePathParameter(environmentKey, { name: 'environmentKey', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Installations environments update. */
  async update(tenantId: string, installationId: string, environmentKey: string, body: IamInstallationEnvironmentUpsertCommand, requestOptions?: ApiRequestOptions): Promise<IamInstallationEnvironment> {
    return this.client.request<IamInstallationEnvironment>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/environments/${serializePathParameter(environmentKey, { name: 'environmentKey', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class IamInstallationsCredentialsPolicyApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Installations credentials policy update. */
  async update(tenantId: string, installationId: string, credentialId: string, body: IamInstallationCredentialPolicyUpdateCommand, requestOptions?: ApiRequestOptions): Promise<IamInstallationCredential> {
    return this.client.request<IamInstallationCredential>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/credentials/${serializePathParameter(credentialId, { name: 'credentialId', style: 'simple', explode: false })}/policy`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface IamInstallationsCredentialsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamInstallationsCredentialsApi {
  private client: HttpClient;
  public readonly policy: IamInstallationsCredentialsPolicyApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.policy = new IamInstallationsCredentialsPolicyApi(client);
  }


/** Installations credentials list. */
  async list(tenantId: string, installationId: string, params?: IamInstallationsCredentialsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: IamInstallationCredential[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: IamInstallationCredential[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/credentials`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Installations credentials create. */
  async create(tenantId: string, installationId: string, body: IamInstallationCredentialCreateCommand, requestOptions?: ApiRequestOptions): Promise<IamInstallationCredentialWithSecret> {
    return this.client.request<IamInstallationCredentialWithSecret>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/credentials`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Installations credentials revoke. */
  async revoke(tenantId: string, installationId: string, credentialId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/credentials/${serializePathParameter(credentialId, { name: 'credentialId', style: 'simple', explode: false })}/revoke`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'command' });
  }

/** Installations credentials rotate. */
  async rotate(tenantId: string, installationId: string, credentialId: string, body: IamInstallationCredentialRotateCommand, requestOptions?: ApiRequestOptions): Promise<IamInstallationCredentialWithSecret> {
    return this.client.request<IamInstallationCredentialWithSecret>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/credentials/${serializePathParameter(credentialId, { name: 'credentialId', style: 'simple', explode: false })}/rotate`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class IamInstallationsManagementByDeployApplicationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Installations management by Deploy Application disable. */
  async disable(deployApplicationId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/installations/by_deploy_application/${serializePathParameter(deployApplicationId, { name: 'deployApplicationId', style: 'simple', explode: false })}/disable`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', skipAuth: true, sdkworkUnwrapKind: 'command' });
  }
}

export class IamInstallationsManagementApi {
  private client: HttpClient;
  public readonly byDeployApplication: IamInstallationsManagementByDeployApplicationApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.byDeployApplication = new IamInstallationsManagementByDeployApplicationApi(client);
  }


/** Installations management create. */
  async create(tenantId: string, body: IamInstallationManagementProvisionCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Installations management update. */
  async update(tenantId: string, installationId: string, body?: IamInstallationManagementUpdateCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }

/** Installations management disable. */
  async disable(tenantId: string, installationId: string, body: IamInstallationStatusCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/disable`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'command' });
  }

/** Installations management enable. */
  async enable(tenantId: string, installationId: string, body: IamInstallationStatusCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/enable`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'command' });
  }
}

export class IamInstallationsReadinessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Installations readiness retrieve. */
  async retrieve(installationId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/readiness`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamInstallationsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  status?: string;
  environment?: string;
  applicationType?: string;
}

export class IamInstallationsApi {
  private client: HttpClient;
  public readonly readiness: IamInstallationsReadinessApi;
  public readonly management: IamInstallationsManagementApi;
  public readonly credentials: IamInstallationsCredentialsApi;
  public readonly environments: IamInstallationsEnvironmentsApi;
  public readonly summary: IamInstallationsSummaryApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.readiness = new IamInstallationsReadinessApi(client);
    this.management = new IamInstallationsManagementApi(client);
    this.credentials = new IamInstallationsCredentialsApi(client);
    this.environments = new IamInstallationsEnvironmentsApi(client);
    this.summary = new IamInstallationsSummaryApi(client);
  }


/** Installations create. */
  async create(body: AppbaseInstallationProvisionCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/installations`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', skipAuth: true, sdkworkUnwrapKind: 'item' });
  }

/** Installations retrieve. */
  async retrieve(installationId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Installations update. */
  async update(installationId: string, body?: AppbaseInstallationUpdateCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), skipAuth: true, sdkworkUnwrapKind: 'item' });
  }

/** Installations enable. */
  async enable(installationId: string, body: AppbaseInstallationEnableCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/enable`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', skipAuth: true, sdkworkUnwrapKind: 'command' });
  }

/** Installations reconcile. */
  async reconcile(installationId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/installations/${serializePathParameter(installationId, { name: 'installationId', style: 'simple', explode: false })}/reconcile`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', skipAuth: true, sdkworkUnwrapKind: 'item' });
  }

/** Installations list. */
  async list(tenantId: string, params?: IamInstallationsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'environment', value: params?.environment, style: 'form', explode: true, allowReserved: false },
      { name: 'application_type', value: params?.applicationType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/tenants/${serializePathParameter(tenantId, { name: 'tenantId', style: 'simple', explode: false })}/installations`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export interface IamGroupsMembersListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamGroupsMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Groups members list. */
  async list(groupId: string, params?: IamGroupsMembersListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}/members`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Groups members create. */
  async create(groupId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}/members`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Groups members delete. */
  async delete(groupId: string, memberId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}/members/${serializePathParameter(memberId, { name: 'memberId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }
}

export interface IamGroupsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamGroupsApi {
  private client: HttpClient;
  public readonly members: IamGroupsMembersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.members = new IamGroupsMembersApi(client);
  }


/** Groups list. */
  async list(params?: IamGroupsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/groups`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Groups create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/groups`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Groups delete. */
  async delete(groupId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Groups retrieve. */
  async retrieve(groupId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Groups update. */
  async update(groupId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamDepartmentsTreeRetrieveParams {
  organizationId?: string;
}

export class IamDepartmentsTreeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Departments tree retrieve. */
  async retrieve(params?: IamDepartmentsTreeRetrieveParams, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'organization_id', value: params?.organizationId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, unknown>>(appendQueryString(backendApiPath(`/iam/departments/tree`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamDepartmentsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
  organizationId?: string;
}

export class IamDepartmentsApi {
  private client: HttpClient;
  public readonly tree: IamDepartmentsTreeApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.tree = new IamDepartmentsTreeApi(client);
  }


/** Departments list. */
  async list(params?: IamDepartmentsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'organization_id', value: params?.organizationId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/departments`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Departments create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/departments`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Departments delete. */
  async delete(departmentId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/iam/departments/${serializePathParameter(departmentId, { name: 'departmentId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Departments retrieve. */
  async retrieve(departmentId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/departments/${serializePathParameter(departmentId, { name: 'departmentId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Departments update. */
  async update(departmentId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/departments/${serializePathParameter(departmentId, { name: 'departmentId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamDepartmentAssignmentsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamDepartmentAssignmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Department Assignments list. */
  async list(params?: IamDepartmentAssignmentsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/department_assignments`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Department Assignments create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/department_assignments`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Department Assignments update. */
  async update(assignmentId: string, body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/department_assignments/${serializePathParameter(assignmentId, { name: 'assignmentId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface IamAuditEventsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamAuditEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Audit Events list. */
  async list(params?: IamAuditEventsListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/audit_events`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Audit Events retrieve. */
  async retrieve(auditEventId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/audit_events/${serializePathParameter(auditEventId, { name: 'auditEventId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }
}

export interface IamApiKeysListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string;
  q?: string;
}

export class IamApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Api Keys list. */
  async list(params?: IamApiKeysListParams, requestOptions?: ApiRequestOptions): Promise<SdkWorkPageData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<SdkWorkPageData>(appendQueryString(backendApiPath(`/iam/api_keys`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Api Keys create. */
  async create(body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/api_keys`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Api Keys revoke. */
  async revoke(apiKeyId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<SdkWorkCommandData> {
    return this.client.request<SdkWorkCommandData>(backendApiPath(`/iam/api_keys/${serializePathParameter(apiKeyId, { name: 'apiKeyId', style: 'simple', explode: false })}/revoke`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'command' });
  }

/** Api Keys rotate. */
  async rotate(apiKeyId: string, body: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/api_keys/${serializePathParameter(apiKeyId, { name: 'apiKeyId', style: 'simple', explode: false })}/rotate`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class IamAccountBindingPolicyApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Account Binding Policy retrieve. */
  async retrieve(requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/account_binding_policy`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Account Binding Policy update. */
  async update(body?: AppbaseOperationCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/account_binding_policy`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, ...(body !== undefined ? { body, contentType: 'application/json' } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export class IamAccessCredentialsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Access Credentials create. */
  async create(body: AppbaseAccessCredentialCreateCommand, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/iam/access_credentials`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', skipAuth: true, sdkworkUnwrapKind: 'item' });
  }
}

export class IamApi {
  public readonly accessCredentials: IamAccessCredentialsApi;
  public readonly accountBindingPolicy: IamAccountBindingPolicyApi;
  public readonly apiKeys: IamApiKeysApi;
  public readonly auditEvents: IamAuditEventsApi;
  public readonly departmentAssignments: IamDepartmentAssignmentsApi;
  public readonly departments: IamDepartmentsApi;
  public readonly groups: IamGroupsApi;
  public readonly installations: IamInstallationsApi;
  public readonly organizationMemberships: IamOrganizationMembershipsApi;
  public readonly organizations: IamOrganizationsApi;
  public readonly permissions: IamPermissionsApi;
  public readonly policies: IamPoliciesApi;
  public readonly positionAssignments: IamPositionAssignmentsApi;
  public readonly positions: IamPositionsApi;
  public readonly providerAccounts: IamProviderAccountsApi;
  public readonly providerCredentials: IamProviderCredentialsApi;
  public readonly roleBindings: IamRoleBindingsApi;
  public readonly roles: IamRolesApi;
  public readonly securityEvents: IamSecurityEventsApi;
  public readonly serviceAccountCredentials: IamServiceAccountCredentialsApi;
  public readonly serviceAccountTokens: IamServiceAccountTokensApi;
  public readonly serviceAccounts: IamServiceAccountsApi;
  public readonly tenants: IamTenantsApi;
  public readonly enterpriseOrders: IamEnterpriseOrdersApi;
  public readonly publisherEnterpriseOrders: IamPublisherEnterpriseOrdersApi;
  public readonly enterpriseOrderAuthorizations: IamEnterpriseOrderAuthorizationsApi;
  public readonly enterpriseOrderTerminations: IamEnterpriseOrderTerminationsApi;
  public readonly enterpriseGrants: IamEnterpriseGrantsApi;
  public readonly enterpriseSeatBlacklist: IamEnterpriseSeatBlacklistApi;
  public readonly enterpriseSeatPolicies: IamEnterpriseSeatPoliciesApi;
  public readonly enterpriseSeats: IamEnterpriseSeatsApi;
  public readonly users: IamUsersApi;

  constructor(client: HttpClient) {
    this.accessCredentials = new IamAccessCredentialsApi(client);
    this.accountBindingPolicy = new IamAccountBindingPolicyApi(client);
    this.apiKeys = new IamApiKeysApi(client);
    this.auditEvents = new IamAuditEventsApi(client);
    this.departmentAssignments = new IamDepartmentAssignmentsApi(client);
    this.departments = new IamDepartmentsApi(client);
    this.groups = new IamGroupsApi(client);
    this.installations = new IamInstallationsApi(client);
    this.organizationMemberships = new IamOrganizationMembershipsApi(client);
    this.organizations = new IamOrganizationsApi(client);
    this.permissions = new IamPermissionsApi(client);
    this.policies = new IamPoliciesApi(client);
    this.positionAssignments = new IamPositionAssignmentsApi(client);
    this.positions = new IamPositionsApi(client);
    this.providerAccounts = new IamProviderAccountsApi(client);
    this.providerCredentials = new IamProviderCredentialsApi(client);
    this.roleBindings = new IamRoleBindingsApi(client);
    this.roles = new IamRolesApi(client);
    this.securityEvents = new IamSecurityEventsApi(client);
    this.serviceAccountCredentials = new IamServiceAccountCredentialsApi(client);
    this.serviceAccountTokens = new IamServiceAccountTokensApi(client);
    this.serviceAccounts = new IamServiceAccountsApi(client);
    this.tenants = new IamTenantsApi(client);
    this.enterpriseOrders = new IamEnterpriseOrdersApi(client);
    this.publisherEnterpriseOrders = new IamPublisherEnterpriseOrdersApi(client);
    this.enterpriseOrderAuthorizations = new IamEnterpriseOrderAuthorizationsApi(client);
    this.enterpriseOrderTerminations = new IamEnterpriseOrderTerminationsApi(client);
    this.enterpriseGrants = new IamEnterpriseGrantsApi(client);
    this.enterpriseSeatBlacklist = new IamEnterpriseSeatBlacklistApi(client);
    this.enterpriseSeatPolicies = new IamEnterpriseSeatPoliciesApi(client);
    this.enterpriseSeats = new IamEnterpriseSeatsApi(client);
    this.users = new IamUsersApi(client);
  }

}

export function createIamApi(client: HttpClient): IamApi {
  return new IamApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
