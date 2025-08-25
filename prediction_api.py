from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

# 1. API가 입력받을 데이터의 형식을 Pydantic 모델로 정확히 정의합니다.
#    `instance_dict`의 모든 키를 여기에 필드로 추가합니다.
class ModelInput(BaseModel):
    kospi_futures_change_pct: str
    kospi_futures_low: str
    kospi_futures_price: str
    kospi_futures_open: str
    kospi_futures_high: str
    ixic_vol: str
    ixic_low: str
    ixic_price: str
    ixic_high: str
    ixic_open: str
    ixic_change_pct: str
    usdkrw_change_pct: str
    usdkrw_high: str
    usdkrw_price: str
    usdkrw_low: str
    usdkrw_open: str
    kospi_spot_open: str
    kospi_spot_low: str
    kospi_spot_price: str
    kospi_spot_high: str
    kospi_spot_vol: str
    kospi_spot_change_pct: str
    nasdaq100_price: str
    nasdaq100_low: str
    nasdaq100_high: str
    nasdaq100_open: str
    nasdaq100_change_pct: str
    nasdaq100_vol: str
    sp500_open: str
    sp500_price: str
    sp500_low: str
    sp500_high: str
    sp500_change_pct: str

# 실제 `predict_tabular_classification_sample` 함수를 모방한 함수입니다.
# 실제 환경에서는 `from testml import ...` 구문을 사용하세요.
def mock_predict_tabular_classification_sample(project, endpoint_id, instance_dict):
    print(f"모델 예측을 위해 받은 데이터: {json.dumps(instance_dict, indent=2)}")
    # 예측 성공을 가정하고 예시 결과 반환
    return {"prediction": "DOWN", "confidence": 0.91}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# 2. `/predict` 엔드포인트는 이제 `ModelInput` 형식의 데이터를 받습니다.
@app.post("/predict")
async def run_prediction(model_input: ModelInput):
    try:
        # 3. 입력받은 Pydantic 모델을 딕셔너리로 변환합니다.
        #    이 딕셔너리는 원래 코드의 `instance_dict`와 완벽히 동일한 구조입니다.
        instance_to_predict = model_input.dict()

        # 4. 변환된 딕셔너리를 모델 예측 함수에 그대로 전달합니다.
        # 실제 코드에서는 이 부분을 사용합니다:
        # from testml import predict_tabular_classification_sample
        # result = predict_tabular_classification_sample(
        #     project="andong04",
        #     endpoint_id="1915362449725325312",
        #     instance_dict=instance_to_predict
        # )

        # 지금은 모의 함수를 사용합니다.
        result = mock_predict_tabular_classification_sample(
            project="andong04",
            endpoint_id="1915362449725325312",
            instance_dict=instance_to_predict
        )
        return result

    except Exception as e:
        return {"error": str(e)}