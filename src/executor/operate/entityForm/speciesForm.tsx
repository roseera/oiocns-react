import React from 'react';
import { ProFormColumnsType } from '@ant-design/pro-components';
import SchemaForm from '@/components/SchemaForm';
import { IDirectory } from '@/ts/core';
import UploadItem from '../../tools/uploadItem';
import { ISpecies } from '@/ts/core';
import { EntityColumns } from './entityColumns';
import { schema } from '@/ts/base';
import { Button } from 'antd';

interface Iprops {
  formType: string;
  typeName: string;
  current: IDirectory | ISpecies;
  finished: () => void;
}
/*
  编辑
*/
const SpeciesForm = (props: Iprops) => {
  let title = '';
  let directory: IDirectory;
  let species: ISpecies | undefined;
  const readonly = props.formType === 'remark';
  let initialValue: any = props.current.metadata;
  switch (props.formType) {
    case 'new':
      title = '新建' + props.typeName;
      initialValue = {};
      directory = props.current as IDirectory;
      break;
    case 'update':
      species = props.current as ISpecies;
      directory = species.directory;
      title = '更新' + props.typeName;
      break;
    case 'remark':
      species = props.current as ISpecies;
      directory = species.directory;
      title = '查看' + props.typeName;
      break;
    default:
      return <></>;
  }
  const columns: ProFormColumnsType<schema.XSpecies>[] = [
    {
      title: '图标',
      dataIndex: 'icon',
      colProps: { span: 24 },
      renderFormItem: (_, __, form) => {
        return (
          <UploadItem
            readonly={readonly}
            typeName={props.typeName}
            icon={initialValue.icon}
            onChanged={(icon) => {
              form.setFieldValue('icon', icon);
            }}
            directory={directory}
          />
        );
      },
    },
    {
      title: '名称',
      dataIndex: 'name',
      readonly: readonly,
      formItemProps: {
        rules: [{ required: true, message: '分类名称为必填项' }],
      },
    },
    {
      title: '代码',
      dataIndex: 'code',
      readonly: readonly,
      formItemProps: {
        rules: [{ required: true, message: '分类代码为必填项' }],
      },
    },
  ];


  if (props.typeName === '资产'){
    columns.push({
      title: '国家标准分类名称',
      dataIndex: 'standardName',
      readonly: readonly,
      formItemProps: {
        rules: [{ required: true, message: '国家标准分类名称为必填项' }],
      },
    });
    columns.push({
      title: '使用AI模型实现国标和代码的智能分类', // 按钮列的标题
      key: 'action',
      renderFormItem: (_, __, form) => {
        // 处理点击事件的函数
        const handlePredictClick = async () => {
          // 获取名称字段的值
          const nameValue = form.getFieldValue('name');
          // 发送请求到后端（请替换成您的后端接口）
          const response = await fetch('http://localhost:5000/api/predict', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: nameValue }),
          });
          if (response.ok) {
            const data = await response.json();
            // 假设后端返回的数据结构是 { code: '返回的代码', standardName: '返回的国家标准分类名称' }
            // 更新代码和国家标准分类名称字段的值
            form.setFieldsValue({
              code: data.code,
              standardName: data.standardName,
            });
          } else {
            // 处理错误情况
            console.error('预测失败:', response.statusText);
          }
        };
  
        return (
          <Button type="primary" onClick={handlePredictClick}>
            预测
          </Button>
        );
      },
    });
  }
  if (readonly) {
    columns.push(...EntityColumns(props.current!.metadata));
  }
  columns.push({
    title: '备注信息',
    dataIndex: 'remark',
    valueType: 'textarea',
    colProps: { span: 24 },
    readonly: readonly,
    formItemProps: {
      rules: [{ required: true, message: '备注信息为必填项' }],
    },
  });
  return (
    <SchemaForm<schema.XSpecies>
      open
      title={title}
      width={640}
      columns={columns}
      initialValues={initialValue}
      rowProps={{
        gutter: [24, 0],
      }}
      layoutType="ModalForm"
      onOpenChange={(open: boolean) => {
        if (!open) {
          props.finished();
        }
      }}
      onFinish={async (values) => {
        values.typeName = props.typeName;
        switch (props.formType) {
          case 'update':
            await species!.update(values);
            break;
          case 'new':
            await directory.standard.createSpecies(values);
            break;
        }
        props.finished();
      }}
    />
  );
};

export default SpeciesForm;
