export interface QueryRecordParams {
  domain: string;
  keyWords?: string;
}

export interface RecordData {
  recordId?: any;
  RR?: string;
  type?: 'TXT' | 'CNAME';
  value?: string;
  TTL?: 600;
}

export class IDnsProvider {
  protected accessKey: string = '';
  protected accessSecret: string = '';
  constructor(accessKey: string, accessSecret: string) {
    if (new.target === IDnsProvider) {
      throw new TypeError('Cannot construct Abstract instances directly');
    }
    this.accessKey = accessKey;
    this.accessSecret = accessSecret;
  }

  async setRecord(domain: string, record: RecordData): Promise<RecordData> {
    throw new Error("Method 'setRecord()' must be implemented.");
  }

  async updateRecord(domain: string, record: RecordData) {
    throw new Error("Method 'updateRecord()' must be implemented.");
  }

  async queryRecord(queryParams: QueryRecordParams) {
    throw new Error("Method 'queryRecord()' must be implemented.");
  }

  async deleteRecord(domain: string, queryParams: RecordData) {
    throw new Error("Method 'queryRecord()' must be implemented.");
  }
  async checkDns() {
    throw new Error("Method 'checkDns()' must be implemented.");
  }
  async checkDomainDnsRecord(domain, record: RecordData) {
    throw new Error("Method 'checkDomainDnsRecord()' must be implemented.");
  }
}
