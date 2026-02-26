import { largeClassExcelUtils } from './src/utils/excel';

// 测试原始数据格式
const testData = "创新素质培育（理论） 王薇：【1-5，8-17周】 实训207";

console.log('测试数据:', testData);
const result = largeClassExcelUtils.parseClassInfoImproved(testData);
console.log('解析结果:', JSON.stringify(result, null, 2));

// 测试其他格式
const testData2 = "合唱与指挥（二）- 王冠慈:【1-2,5,7-18周】 音乐厅310";
console.log('\n测试数据2:', testData2);
const result2 = largeClassExcelUtils.parseClassInfoImproved(testData2);
console.log('解析结果2:', JSON.stringify(result2, null, 2));

const testData3 = "劳动教育- 实训指导教师:【3-4周】";
console.log('\n测试数据3:', testData3);
const result3 = largeClassExcelUtils.parseClassInfoImproved(testData3);
console.log('解析结果3:', JSON.stringify(result3, null, 2));
