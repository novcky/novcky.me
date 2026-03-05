export interface TrajectoryRecord {
  userName: string
  workArea: string
  recordTime: string
  lineName: string
  speed: number
  lat: number
  lng: number
}

interface TrajectoryPoint {
  lat: number
  lng: number
  speed: number
}

// 轨迹点使用“自然蛇形 + 局部回摆”，并插入两段低速短停留，模拟巡检时驻足与回看。
const trajectoryPoints: TrajectoryPoint[] = [
  { lat: 22.831, lng: 108.3338, speed: 12 },
  { lat: 22.8308, lng: 108.3364, speed: 15 },
  { lat: 22.8307, lng: 108.3397, speed: 17 },
  { lat: 22.8305, lng: 108.343, speed: 16 },
  { lat: 22.8304, lng: 108.3464, speed: 20 },
  { lat: 22.8302, lng: 108.3497, speed: 22 },
  { lat: 22.8301, lng: 108.3521, speed: 19 },
  { lat: 22.8297, lng: 108.3511, speed: 17 },
  { lat: 22.8293, lng: 108.3482, speed: 16 },
  { lat: 22.829, lng: 108.3449, speed: 18 },
  { lat: 22.8289, lng: 108.3428, speed: 14 },
  { lat: 22.8291, lng: 108.3436, speed: 11 },
  { lat: 22.829, lng: 108.3431, speed: 7 },
  { lat: 22.8292, lng: 108.3429, speed: 5 },
  { lat: 22.8289, lng: 108.343, speed: 8 },
  { lat: 22.8288, lng: 108.3407, speed: 17 },
  { lat: 22.8286, lng: 108.3378, speed: 15 },
  { lat: 22.8283, lng: 108.3346, speed: 13 },
  { lat: 22.8279, lng: 108.3331, speed: 12 },
  { lat: 22.8274, lng: 108.3341, speed: 16 },
  { lat: 22.8271, lng: 108.3371, speed: 18 },
  { lat: 22.8269, lng: 108.3404, speed: 21 },
  { lat: 22.8268, lng: 108.3438, speed: 20 },
  { lat: 22.8267, lng: 108.3472, speed: 18 },
  { lat: 22.8266, lng: 108.3504, speed: 22 },
  { lat: 22.8265, lng: 108.3525, speed: 23 },
  { lat: 22.8261, lng: 108.3516, speed: 17 },
  { lat: 22.8258, lng: 108.3486, speed: 19 },
  { lat: 22.8256, lng: 108.3454, speed: 18 },
  { lat: 22.8254, lng: 108.3421, speed: 19 },
  { lat: 22.8252, lng: 108.3388, speed: 16 },
  { lat: 22.825, lng: 108.3358, speed: 15 },
  { lat: 22.8248, lng: 108.3335, speed: 14 },
  { lat: 22.8243, lng: 108.3343, speed: 16 },
  { lat: 22.824, lng: 108.3374, speed: 18 },
  { lat: 22.8238, lng: 108.3407, speed: 20 },
  { lat: 22.8236, lng: 108.3441, speed: 19 },
  { lat: 22.8235, lng: 108.3447, speed: 6 },
  { lat: 22.8237, lng: 108.3445, speed: 4 },
  { lat: 22.8234, lng: 108.3448, speed: 7 },
  { lat: 22.8234, lng: 108.3473, speed: 21 },
  { lat: 22.8232, lng: 108.3501, speed: 22 },
  { lat: 22.8231, lng: 108.352, speed: 18 },
  { lat: 22.8228, lng: 108.3509, speed: 15 },
  { lat: 22.8226, lng: 108.3478, speed: 17 },
]

function createRecordTime(index: number) {
  const totalMinutes = index * 2
  const hour = 9 + Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const hourText = String(hour).padStart(2, '0')
  const minuteText = String(minute).padStart(2, '0')
  return `2026-03-05T${hourText}:${minuteText}:00+08:00`
}

export const movingTrajectoryData: TrajectoryRecord[] = trajectoryPoints.map((point, index) => {
  return {
    userName: 'User',
    workArea: '南宁青秀区',
    recordTime: createRecordTime(index),
    lineName: '青秀巡检蛇形线 A',
    speed: point.speed,
    lat: point.lat,
    lng: point.lng,
  }
})
