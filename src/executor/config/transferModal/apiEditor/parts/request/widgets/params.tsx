import React, { useEffect, useState } from 'react';
import EditableTable from './editable';
import { ILink } from '@/ts/core/thing/link';
import { model } from '@/ts/base';
import { generateUuid } from '@/ts/base/common';

export interface IProps {
  current: ILink;
  node: model.RequestNode;
}

export interface Param {
  id: string;
  key?: string;
  value?: string;
  description?: string;
}

const toUrlParams = (url: string = '', params: readonly Param[]): string => {
  let parts = url.split('?');
  let ans = params.map((item) => `${item.key ?? ''}=${item.value ?? ''}`).join('&');
  return parts[0] + '?' + ans;
};

const toParams = (value?: string): Param[] => {
  if (value) {
    let mark = value.indexOf('?');
    if (mark != -1) {
      let params = value.substring(mark + 1);
      let groups = params.split('&');
      let data: Param[] = [];
      for (let group of groups) {
        let split = group.split('=', 2);
        data.push({
          id: generateUuid(),
          key: split[0],
          value: split.length > 1 ? split[1] : '',
        });
      }
      return data;
    }
  }
  return [];
};

const Params: React.FC<IProps> = ({ current, node }) => {
  const [params, setParams] = useState<readonly Param[]>(toParams(node.data.uri));

  useEffect(() => {
    const id = current.command.subscribe((type, cmd, args) => {
      if (type == 'node' && cmd == 'update') {
        setParams(toParams(args.data.uri));
      }
    });
    return () => {
      current.unsubscribe(id!);
    };
  });

  const onChange = (params: readonly Param[]) => {
    const url = toUrlParams(node.data.uri, params);
    node.data.uri = url;
    current.updNode(node);
  };

  return (
    <EditableTable<Param>
      value={params}
      onChange={onChange}
      columns={[
        {
          title: 'Key',
          dataIndex: 'key',
        },
        {
          title: 'Value',
          dataIndex: 'value',
        },
        {
          title: 'Description',
          dataIndex: 'description',
        },
        {
          title: 'Option',
          dataIndex: 'operate',
          editable: false,
          render: (_, record) => [
            <a
              key="delete"
              onClick={() => onChange(params.filter((item) => item.id != record.id))}>
              删除
            </a>,
          ],
        },
      ]}
    />
  );
};

export default Params;