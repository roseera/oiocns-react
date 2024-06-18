from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import spacy
import pandas as pd
import numpy as np
import scipy.spatial


def create_app():
    app = Flask(__name__, template_folder='templates')
    app.static_folder = 'static'
    global model, df, nlp
    model = SentenceTransformer('./output') # sentence_BERT模型文件
    print("成功加载模型！！！")
    nlp = spacy.load('zh_core_web_sm')

    # 读取数据
    df = pd.read_csv('./data/设备类.csv')
    return model, nlp, df, app


model, nlp, df, app = create_app()
CORS(app)  # 启用CORS支持


def predict_code_and_standard_name(name):
    # 加载模型和Spacy的中文处理器
    corpus = df['资产名称'].tolist()

    # 词性加权
    def weighted_encode(sentences, noun_weight=2.0, decay_factor=0.5):
        encoded = []
        for sentence in sentences:
            doc = nlp(sentence)
            words = [token.text for token in doc]
            weights = []
            decay = 1.0
            for token in reversed(doc):
                if token.pos_ == 'NOUN':
                    weights.insert(0, noun_weight * decay)
                else:
                    weights.insert(0, decay)
                decay *= decay_factor
            weights = np.array(weights)
            weights = np.expand_dims(weights, axis=-1)
            sentence_embedding = model.encode(words)
            weighted_embedding = sentence_embedding * weights
            encoded.append(weighted_embedding.mean(axis=0))
        return encoded

    # 定义一个函数来查找代码
    def get_code(asset_name):
        code = df.loc[df['资产名称'] == asset_name, '代码'].values[0]
        return code

    # 对语料库进行加权编码
    corpus_embeddings = weighted_encode(corpus)

    queries = [name]
    # 对查询进行加权编码
    query_embeddings = weighted_encode(queries)

    # 计算相似度
    closest_n = 5
    answer = []
    for query, query_embedding in zip(queries, query_embeddings):
        distances = scipy.spatial.distance.cdist([query_embedding], corpus_embeddings, "cosine")[0]
        # 按照举例逆序
        results = zip(range(len(distances)), distances)
        results = sorted(results, key=lambda x: x[1])
        print("=========================")
        print('Query:', query)
        print('Result:Top 5 most similar sentences in corpus:')
        for idx, distance in results[0:closest_n]:
            print(corpus[idx].strip(), "(Score: %4f)" % (1 - distance))
        idx, distance = results[0]
        answer.append(corpus[idx].strip())
        code = get_code(answer[0])
        print(f'最匹配的资产名称: {answer[0]}, 对应的代码: {code}')

    return {'code': code, 'standardName': answer[0]}


@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    name = data.get('name')
    print(name)
    # 假设我的AI模型返回一个字典，包含预测的代码和国家标准分类名称
    prediction_result = predict_code_and_standard_name(name)

    return jsonify(prediction_result)


if __name__ == '__main__':
    app.run(port=5000)  # 启动Flask应用，监听在5000端口
