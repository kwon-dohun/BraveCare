// 사진이 너무 흐린지 올리기 전에 폰에서 잰다. 640px 폭 회색조에 라플라시안(윤곽 세기)을 걸어 분산을 구한 점수 — 클수록 선명하다.
// 가짜 서류에 흐림(blur)만 단계로 줘서 읽기 정확도와 맞춰 봤더니 점수 80 이상은 약 이름까지 읽혔고 30 아래부터 틀렸다.
// 글자가 적은 서류는 점수가 낮게 나오므로 막지 않고 "그래도 읽기"를 남긴다.
export const BLUR_MIN = 40;

export function sharpness(gray: ArrayLike<number>, w: number, h: number): number {
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += l; sum2 += l * l; n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sum2 / n - mean * mean;
}
