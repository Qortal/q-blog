export interface NameRecord {
  name: string;
  owner: string;
}

export async function getAccountNames(address: string): Promise<NameRecord[]> {
  try {
    const res = await qortalRequest({
      action: 'GET_ACCOUNT_NAMES',
      address,
    });
    const list = Array.isArray(res) ? res : [];
    if (!list.length) return [{ name: '', owner: address }];
    return list.map((n: any) => ({
      name: typeof n?.name === 'string' ? n.name : '',
      owner: typeof n?.owner === 'string' ? n.owner : address,
    }));
  } catch {
    return [{ name: '', owner: address }];
  }
}

export async function getPrimaryAccountName(address: string): Promise<string> {
  try {
    const res = await qortalRequest({
      action: 'GET_PRIMARY_NAME',
      address,
    });
    return typeof res === 'string' ? res : '';
  } catch {
    return '';
  }
}
