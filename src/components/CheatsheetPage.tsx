// components/CheatsheetPage.tsx
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Search, Filter, BookOpen, TrendingUp, 
  DollarSign, PieChart, BarChart3, Zap, X, ChevronRight 
} from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

// ============================================================================
// 타입 정의
// ============================================================================

interface CheatsheetItem {
  id: number;
  term: string;
  category: "주식기초" | "암호화폐" | "ETF" | "경제지표" | "재무제표" | "앱용어";
  definition: string;
  formula?: string;
  example?: string;
  tip?: string;
}

interface CheatsheetPageProps {
  onBack: () => void;
}

// ============================================================================
// 데이터 (120개 전체)
// ============================================================================

const CHEATSHEET_DATA: CheatsheetItem[] = [
  // === 주식 기초 (30개) ===
  {
    id: 1,
    term: "PER (주가수익비율)",
    category: "주식기초",
    definition: "주가를 주당순이익(EPS)으로 나눈 값이에요. 주식이 1년 동안 벌어들인 이익 대비 몇 배로 거래되는지를 나타내죠.",
    formula: "PER = 주가 ÷ EPS",
    example: "주가 $100, EPS $5면 PER은 20배예요. 즉, 현재 주가가 1년 수익의 20배라는 뜻이에요.",
    tip: "업종마다 적정 PER이 다르니 같은 업종 기업들과 비교하는 게 중요해요. 보통 15배 이하면 저평가, 30배 이상이면 고평가로 봐요."
  },
  {
    id: 2,
    term: "PBR (주가순자산비율)",
    category: "주식기초",
    definition: "주가를 주당순자산(BPS)으로 나눈 값이에요. 회사가 지금 당장 문을 닫으면 주주들이 받을 수 있는 자산 대비 주가가 몇 배인지를 보여줘요.",
    formula: "PBR = 주가 ÷ BPS",
    example: "주가 $50, BPS $25면 PBR은 2배예요. 순자산의 2배 가격에 거래된다는 의미죠.",
    tip: "PBR 1배 미만이면 이론적으로는 저평가지만, 실제로는 회사의 미래 성장성이 낮다는 신호일 수도 있어요."
  },
  {
    id: 3,
    term: "ROE (자기자본이익률)",
    category: "주식기초",
    definition: "회사가 자기자본(주주 돈)을 얼마나 효율적으로 사용해서 이익을 냈는지 보여주는 지표예요.",
    formula: "ROE = (당기순이익 ÷ 자기자본) × 100",
    example: "자기자본 $1,000, 당기순이익 $150이면 ROE는 15%예요. 주주 돈 100원당 15원의 이익을 냈다는 뜻이죠.",
    tip: "ROE가 10% 이상이면 양호, 15% 이상이면 우수한 기업으로 봐요. 하지만 부채가 많으면 ROE가 높게 나올 수 있으니 부채비율도 함께 확인하세요!"
  },
  {
    id: 4,
    term: "ROA (총자산이익률)",
    category: "주식기초",
    definition: "회사가 보유한 총자산으로 얼마나 효율적으로 이익을 냈는지 보여주는 지표예요. ROE와 달리 부채까지 포함한 총자산 기준이에요.",
    formula: "ROA = (당기순이익 ÷ 총자산) × 100",
    example: "총자산 $2,000, 당기순이익 $100이면 ROA는 5%예요.",
    tip: "ROA는 업종별 차이가 크니까 같은 업종 기업들끼리 비교하는 게 좋아요. 제조업은 5% 이상, IT업은 10% 이상이면 우수해요."
  },
  {
    id: 5,
    term: "EPS (주당순이익)",
    category: "주식기초",
    definition: "회사가 벌어들인 순이익을 발행 주식 수로 나눈 값이에요. 주식 한 주당 얼마의 이익을 냈는지 알 수 있죠.",
    formula: "EPS = 당기순이익 ÷ 발행주식수",
    example: "순이익 $1억, 발행주식 1천만 주면 EPS는 $10이에요.",
    tip: "EPS가 매년 꾸준히 증가하는 기업이 좋은 투자처예요. PER을 계산할 때도 꼭 필요한 지표죠!"
  },
  {
    id: 6,
    term: "BPS (주당순자산가치)",
    category: "주식기초",
    definition: "회사의 순자산(자산-부채)을 발행 주식 수로 나눈 값이에요. 주식 한 주가 가진 순자산 가치를 나타내죠.",
    formula: "BPS = 순자산 ÷ 발행주식수",
    example: "순자산 $5억, 발행주식 1천만 주면 BPS는 $50이에요.",
    tip: "주가가 BPS보다 낮으면 저평가 신호일 수 있지만, 회사의 미래 전망도 함께 봐야 해요."
  },
  {
    id: 7,
    term: "배당수익률",
    category: "주식기초",
    definition: "1년 동안 받는 배당금을 주가로 나눈 값이에요. 주식을 사면 얼마나 배당을 받을 수 있는지 알려줘요.",
    formula: "배당수익률 = (연간 배당금 ÷ 주가) × 100",
    example: "주가 $100, 연간 배당금 $4면 배당수익률은 4%예요.",
    tip: "배당수익률이 5% 이상이면 고배당주로 분류돼요. 하지만 너무 높으면 회사 상황이 안 좋을 수도 있으니 배당성향도 확인하세요!"
  },
  {
    id: 8,
    term: "배당성향",
    category: "주식기초",
    definition: "회사가 벌어들인 순이익 중 얼마를 배당으로 지급했는지 보여주는 비율이에요.",
    formula: "배당성향 = (배당금 ÷ 당기순이익) × 100",
    example: "순이익 $1억, 배당금 $3천만이면 배당성향은 30%예요.",
    tip: "배당성향이 40-60%면 적정해요. 너무 높으면 회사가 성장에 재투자할 돈이 부족할 수 있고, 너무 낮으면 주주환원이 약하다는 뜻이에요."
  },
  {
    id: 9,
    term: "부채비율",
    category: "주식기초",
    definition: "회사가 자기자본 대비 얼마나 빚을 지고 있는지 보여주는 지표예요. 재무 건전성을 파악할 수 있죠.",
    formula: "부채비율 = (부채 ÷ 자기자본) × 100",
    example: "부채 $3억, 자기자본 $2억이면 부채비율은 150%예요.",
    tip: "부채비율이 200% 이하면 안정적, 100% 이하면 매우 안전해요. 하지만 업종마다 다르니 참고만 하세요!"
  },
  {
    id: 10,
    term: "유동비율",
    category: "주식기초",
    definition: "회사가 1년 내 갚아야 할 빚(유동부채)을 현금화할 수 있는 자산(유동자산)으로 얼마나 커버할 수 있는지 보여주는 지표예요.",
    formula: "유동비율 = (유동자산 ÷ 유동부채) × 100",
    example: "유동자산 $5억, 유동부채 $2억이면 유동비율은 250%예요.",
    tip: "유동비율이 200% 이상이면 단기 지급능력이 우수해요. 100% 미만이면 자금난 위험이 있어요."
  },
  {
    id: 11,
    term: "당좌비율",
    category: "주식기초",
    definition: "유동비율보다 보수적인 지표로, 재고자산을 빼고 즉시 현금화 가능한 자산만으로 단기부채를 갚을 수 있는지 봐요.",
    formula: "당좌비율 = ((유동자산 - 재고자산) ÷ 유동부채) × 100",
    example: "유동자산 $5억, 재고 $1억, 유동부채 $2억이면 당좌비율은 200%예요.",
    tip: "당좌비율이 100% 이상이면 안전해요. 재고 판매가 어려운 제조업에선 특히 중요한 지표예요."
  },
  {
    id: 12,
    term: "시가총액",
    category: "주식기초",
    definition: "회사의 모든 주식을 현재 주가로 환산한 총 가치예요. 회사의 '덩치'를 나타내죠.",
    formula: "시가총액 = 주가 × 발행주식수",
    example: "주가 $100, 발행주식 1억 주면 시가총액은 $100억이에요.",
    tip: "대형주는 $100억 이상, 중형주는 $20억~$100억, 소형주는 $20억 이하로 분류해요."
  },
  {
    id: 13,
    term: "영업이익률",
    category: "주식기초",
    definition: "매출액 중 영업이익이 차지하는 비율이에요. 본업에서 얼마나 효율적으로 이익을 내는지 알 수 있죠.",
    formula: "영업이익률 = (영업이익 ÷ 매출액) × 100",
    example: "매출 $10억, 영업이익 $2억이면 영업이익률은 20%예요.",
    tip: "영업이익률이 10% 이상이면 우수해요. 업종별로 차이가 크니 같은 업종 기업들과 비교하세요!"
  },
  {
    id: 14,
    term: "순이익률",
    category: "주식기초",
    definition: "매출액 중 당기순이익이 차지하는 비율이에요. 모든 비용과 세금을 제외한 최종 이익 비율이죠.",
    formula: "순이익률 = (당기순이익 ÷ 매출액) × 100",
    example: "매출 $10억, 순이익 $1억이면 순이익률은 10%예요.",
    tip: "순이익률이 5% 이상이면 양호해요. 영업이익률과 함께 보면 회사의 수익성을 종합적으로 판단할 수 있어요."
  },
  {
    id: 15,
    term: "EBITDA",
    category: "주식기초",
    definition: "이자, 세금, 감가상각비를 빼기 전 영업이익이에요. 회사의 순수한 영업 현금 창출 능력을 보여줘요.",
    formula: "EBITDA = 영업이익 + 감가상각비",
    example: "영업이익 $2억, 감가상각비 $5천만이면 EBITDA는 $2.5억이에요.",
    tip: "부채가 많거나 자산이 많은 회사를 평가할 때 유용해요. 국제 비교에도 자주 쓰이죠."
  },
  {
    id: 16,
    term: "시장가 주문",
    category: "주식기초",
    definition: "현재 시장에서 거래되는 가격에 즉시 매수/매도하는 주문 방식이에요.",
    example: "현재가 $100에 시장가 매수 주문을 내면 즉시 $100 근처 가격에 체결돼요.",
    tip: "급등/급락장에선 예상보다 불리한 가격에 체결될 수 있으니 주의하세요!"
  },
  {
    id: 17,
    term: "지정가 주문",
    category: "주식기초",
    definition: "원하는 가격을 지정해서 그 가격에 도달했을 때만 체결되는 주문 방식이에요.",
    example: "현재가 $100일 때 $95에 지정가 매수 주문을 내면 주가가 $95 이하로 떨어져야 체결돼요.",
    tip: "원하는 가격에 사고 팔 수 있지만, 체결이 안 될 수도 있어요."
  },
  {
    id: 18,
    term: "손절매",
    category: "주식기초",
    definition: "손실을 확정하고 주식을 파는 거예요. 더 큰 손실을 막기 위한 전략이죠.",
    example: "$100에 산 주식이 $90으로 떨어져서 10% 손실을 보고 파는 게 손절매예요.",
    tip: "매수 전에 손절 라인을 정해두고 지키는 게 중요해요. 보통 -5%~-10%에서 손절해요."
  },
  {
    id: 19,
    term: "익절",
    category: "주식기초",
    definition: "이익을 확정하고 주식을 파는 거예요. 목표 수익률에 도달했을 때 하죠.",
    example: "$100에 산 주식이 $120으로 올라서 20% 이익을 챙기고 파는 게 익절이에요.",
    tip: "욕심 부리지 말고 목표 수익률에 도달하면 익절하는 게 안전해요. 보통 10%~30%에서 익절해요."
  },
  {
    id: 20,
    term: "분할매수",
    category: "주식기초",
    definition: "한 번에 다 사지 않고 여러 번 나눠서 사는 전략이에요. 평균 매수가를 낮출 수 있죠.",
    example: "$10만을 $100, $95, $90에 각각 $3.3만씩 나눠 사는 게 분할매수예요.",
    tip: "하락장에서 효과적이에요. 3-5회 정도로 나눠서 사는 게 일반적이에요."
  },
  {
    id: 21,
    term: "물타기",
    category: "주식기초",
    definition: "주가가 떨어졌을 때 추가 매수해서 평균 단가를 낮추는 전략이에요. 위험할 수 있으니 주의가 필요해요.",
    example: "$100에 10주 샀는데 $80으로 떨어져서 10주 더 사면 평균 단가가 $90이 돼요.",
    tip: "회사 펀더멘털이 좋을 때만 하세요! 망하는 회사에 물타기하면 손실만 커져요."
  },
  {
    id: 22,
    term: "불마켓 (강세장)",
    category: "주식기초",
    definition: "주가가 지속적으로 상승하는 시장이에요. 황소가 뿔로 위로 들이받는 모습에서 유래했죠.",
    example: "2020-2021년 코로나 이후 폭등장이 대표적인 불마켓이에요.",
    tip: "불마켓에선 대부분의 주식이 오르니 장기 투자가 유리해요."
  },
  {
    id: 23,
    term: "베어마켓 (약세장)",
    category: "주식기초",
    definition: "주가가 지속적으로 하락하는 시장이에요. 곰이 앞발로 내리치는 모습에서 유래했죠.",
    example: "2022년 금리 인상기가 대표적인 베어마켓이에요.",
    tip: "베어마켓에선 현금 비중을 높이거나 배당주/방어주로 포트폴리오를 조정하세요."
  },
  {
    id: 24,
    term: "횡보장",
    category: "주식기초",
    definition: "주가가 일정 범위 안에서 오르락내리락하며 큰 방향성 없이 움직이는 시장이에요.",
    example: "S&P 500이 3800-4200 사이를 6개월간 왔다 갔다 하는 게 횡보장이에요.",
    tip: "횡보장에선 단기 매매보다는 배당주나 채권에 투자하는 게 나을 수 있어요."
  },
  {
    id: 25,
    term: "공매도",
    category: "주식기초",
    definition: "주식을 빌려서 팔고, 나중에 싸게 사서 갚는 거예요. 주가 하락으로 이익을 보는 전략이죠.",
    example: "$100짜리 주식을 빌려 팔고, $80에 사서 갚으면 $20 이익이에요.",
    tip: "초보자에겐 위험해요! 주가가 오르면 손실이 무한대로 커질 수 있어요."
  },
  {
    id: 26,
    term: "액면분할",
    category: "주식기초",
    definition: "주식 1주를 여러 주로 쪼개는 거예요. 주가는 떨어지지만 시가총액은 그대로죠.",
    example: "애플이 1:4 액면분할하면 $400짜리 주식 1주가 $100짜리 4주가 돼요.",
    tip: "실제 가치는 변하지 않지만 심리적으로 주식을 사기 쉬워져서 주가가 오를 수 있어요."
  },
  {
    id: 27,
    term: "주식배당",
    category: "주식기초",
    definition: "현금 대신 주식으로 배당을 주는 거예요. 보유 주식 수가 늘어나죠.",
    example: "10% 주식배당이면 100주 보유자는 10주를 추가로 받아요.",
    tip: "현금이 없어도 배당할 수 있지만, 주당 가치는 희석돼요."
  },
  {
    id: 28,
    term: "자사주 매입",
    category: "주식기초",
    definition: "회사가 자기 주식을 시장에서 다시 사들이는 거예요. 주주 환원 방법 중 하나죠.",
    example: "애플이 $1,000억 규모 자사주 매입 프로그램을 발표하는 게 대표적이에요.",
    tip: "발행 주식 수가 줄어들어 EPS가 증가하고 주가가 오를 수 있어요."
  },
  {
    id: 29,
    term: "증자",
    category: "주식기초",
    definition: "회사가 새로운 주식을 발행해서 자본을 늘리는 거예요. 자금 조달 방법이죠.",
    example: "테슬라가 자금 확보를 위해 신주 100만 주를 발행하는 게 증자예요.",
    tip: "주식 수가 늘어나면 기존 주주 지분이 희석되어 주가가 떨어질 수 있어요."
  },
  {
    id: 30,
    term: "감자",
    category: "주식기초",
    definition: "회사가 발행 주식 수를 줄여서 자본을 감소시키는 거예요. 보통 적자 상황에서 해요.",
    example: "10주를 1주로 합치는 1:10 감자를 하면 주가는 10배 오르고 주식 수는 1/10이 돼요.",
    tip: "재무 상태가 안 좋을 때 하는 경우가 많아서 부정적 신호로 받아들여져요."
  },

  // === 암호화폐 (20개) ===
  {
    id: 31,
    term: "비트코인 (BTC)",
    category: "암호화폐",
    definition: "2009년 사토시 나카모토가 만든 최초의 암호화폐예요. 디지털 금이라 불리며 발행량이 2,100만 개로 제한돼 있죠.",
    example: "2010년 1만 BTC로 피자 2판을 샀는데, 지금은 수억 달러 가치예요.",
    tip: "암호화폐 시장의 기축통화 역할을 하며, 비트코인이 오르면 알트코인도 따라 오르는 경향이 있어요."
},
{
  id: 32,
  term: "이더리움 (ETH)",
  category: "암호화폐",
  definition: "비탈릭 부테린이 2015년 만든 스마트 컨트랙트 플랫폼이에요. 단순 화폐를 넘어 탈중앙화 앱을 만들 수 있죠.",
  example: "NFT, DeFi 대부분이 이더리움 네트워크에서 작동해요.",
  tip: "비트코인 다음으로 큰 암호화폐이며, 2022년 작업증명에서 지분증명으로 전환했어요."
},
{
  id: 33,
  term: "알트코인",
  category: "암호화폐",
  definition: "비트코인을 제외한 모든 암호화폐를 통칭하는 말이에요. Alternative Coin의 줄임말이죠.",
  example: "이더리움, 리플, 카르다노 등이 알트코인이에요.",
  tip: "비트코인보다 변동성이 크고 위험하지만, 수익률도 높을 수 있어요."
},
{
  id: 34,
  term: "스테이블코인",
  category: "암호화폐",
  definition: "달러 같은 법정화폐나 금에 가치가 고정된 암호화폐예요. 가격 변동이 거의 없죠.",
  example: "USDT, USDC가 대표적이며 1코인 = 1달러로 유지돼요.",
  tip: "암호화폐 거래소에서 현금처럼 사용하거나, DeFi에서 이자를 받을 때 활용해요."
},
{
  id: 35,
  term: "스테이킹",
  category: "암호화폐",
  definition: "암호화폐를 예치해서 네트워크 운영을 돕고 그 대가로 보상을 받는 거예요. 은행 예금과 비슷하죠.",
  example: "이더리움 32개를 스테이킹하면 연 4-5% 수익을 받을 수 있어요.",
  tip: "스테이킹 기간 동안 코인을 팔 수 없으니 주의하세요. 이자율은 네트워크마다 달라요."
},
{
  id: 36,
  term: "DeFi (탈중앙화 금융)",
  category: "암호화폐",
  definition: "은행이나 증권사 없이 블록체인에서 직접 금융 거래를 하는 시스템이에요.",
  example: "Uniswap에서 중개자 없이 코인을 교환하거나, Compound에서 대출을 받을 수 있어요.",
  tip: "높은 수익률을 제공하지만 해킹이나 스마트 컨트랙트 버그 리스크가 있어요."
},
{
  id: 37,
  term: "NFT",
  category: "암호화폐",
  definition: "Non-Fungible Token. 대체 불가능한 토큰으로, 디지털 자산의 소유권을 증명하는 거예요.",
  example: "Bored Ape Yacht Club 같은 디지털 아트, 게임 아이템 등이 NFT로 거래돼요.",
  tip: "2021-2022년 폭발적 인기를 끌었지만, 현재는 거품이 꺼진 상태예요."
},
{
  id: 38,
  term: "블록체인",
  category: "암호화폐",
  definition: "거래 기록을 블록으로 만들어 체인처럼 연결한 분산 장부 기술이에요. 위조가 거의 불가능하죠.",
  example: "비트코인 모든 거래는 블록체인에 영구 기록돼요.",
  tip: "암호화폐뿐만 아니라 물류, 의료 등 다양한 분야에서 활용되고 있어요."
},
{
  id: 39,
  term: "채굴 (마이닝)",
  category: "암호화폐",
  definition: "컴퓨터로 복잡한 수학 문제를 풀어 거래를 검증하고 새 코인을 보상으로 받는 과정이에요.",
  example: "비트코인 채굴자는 10분마다 6.25 BTC를 보상으로 받아요.",
  tip: "전기세가 많이 들고 고성능 장비가 필요해서 개인이 하기엔 어려워졌어요."
},
{
  id: 40,
  term: "지갑 (Wallet)",
  category: "암호화폐",
  definition: "암호화폐를 보관하고 거래할 수 있는 프로그램이에요. 실제론 개인키를 보관하는 거죠.",
  example: "MetaMask, Ledger가 대표적인 지갑이에요.",
  tip: "개인키를 잃어버리면 코인을 영원히 찾을 수 없으니 반드시 백업하세요!"
},
{
  id: 41,
  term: "콜드월렛 vs 핫월렛",
  category: "암호화폐",
  definition: "콜드월렛은 인터넷에 연결 안 된 오프라인 지갑, 핫월렛은 인터넷에 연결된 온라인 지갑이에요.",
  example: "Ledger 하드웨어 지갑은 콜드월렛, MetaMask는 핫월렛이에요.",
  tip: "장기 보관은 콜드월렛, 자주 거래하면 핫월렛을 쓰세요. 거래소 지갑은 해킹 위험이 있어요."
},
{
  id: 42,
  term: "가스비 (Gas Fee)",
  category: "암호화폐",
  definition: "블록체인에서 거래할 때 내는 수수료예요. 네트워크가 혼잡하면 가스비가 올라가죠.",
  example: "이더리움에서 NFT 민팅할 때 거래 금액보다 가스비가 더 나올 수도 있어요.",
  tip: "네트워크가 한산한 새벽 시간대에 거래하면 가스비를 절약할 수 있어요."
},
{
  id: 43,
  term: "스마트 컨트랙트",
  category: "암호화폐",
  definition: "특정 조건이 충족되면 자동으로 실행되는 계약 프로그램이에요. 중개자가 필요 없죠.",
  example: "A가 B에게 돈을 보내면 자동으로 상품이 배송되는 식으로 작동해요.",
  tip: "이더리움이 스마트 컨트랙트를 처음 도입했고, 이게 DeFi 발전의 기반이 됐어요."
},
{
  id: 44,
  term: "PoW (작업증명)",
  category: "암호화폐",
  definition: "컴퓨터 연산으로 복잡한 문제를 풀어 거래를 검증하는 방식이에요. 비트코인이 사용하죠.",
  example: "채굴자들이 경쟁해서 문제를 먼저 푼 사람이 보상을 받아요.",
  tip: "전력 소비가 많아서 환경 문제가 지적되고 있어요."
},
{
  id: 45,
  term: "PoS (지분증명)",
  category: "암호화폐",
  definition: "코인을 많이 보유한 사람이 거래를 검증할 권한을 얻는 방식이에요. PoW보다 친환경적이죠.",
  example: "이더리움이 2022년 PoW에서 PoS로 전환했어요.",
  tip: "전력 소비가 99% 감소하지만, 부자가 더 부자 되는 구조라는 비판도 있어요."
},
{
  id: 46,
  term: "반감기",
  category: "암호화폐",
  definition: "채굴 보상이 절반으로 줄어드는 시점이에요. 비트코인은 4년마다 반감기가 와요.",
  example: "2024년 4월 비트코인 반감기 때 보상이 6.25 BTC에서 3.125 BTC로 줄었어요.",
  tip: "공급 감소로 가격 상승 기대감이 생겨서 반감기 전후로 상승장이 올 때가 많아요."
},
{
  id: 47,
  term: "ICO",
  category: "암호화폐",
  definition: "Initial Coin Offering. 암호화폐 프로젝트가 자금을 모으기 위해 토큰을 미리 파는 거예요.",
  example: "이더리움이 2014년 ICO로 $18M을 모금했어요.",
  tip: "2017-2018년 ICO 붐 때 사기도 많았어요. 투자 전 백서와 팀을 꼼꼼히 확인하세요."
},
{
  id: 48,
  term: "에어드랍",
  category: "암호화폐",
  definition: "프로젝트가 마케팅이나 커뮤니티 보상으로 무료로 토큰을 나눠주는 거예요.",
  example: "Uniswap이 2020년 사용자들에게 400 UNI씩 에어드랍했는데, 당시 $1,200 가치였어요.",
  tip: "에어드랍 받으려면 지갑 주소를 공개해야 하는데, 사기 사이트 조심하세요!"
},
{
  id: 49,
  term: "디파이 수익률 농사 (Yield Farming)",
  category: "암호화폐",
  definition: "DeFi 프로토콜에 암호화폐를 예치해서 이자나 보상 토큰을 받는 전략이에요.",
  example: "Pancakeswap에 LP 토큰을 스테이킹하면 연 100% 이상 수익률을 받을 수도 있어요.",
  tip: "고수익 뒤엔 높은 리스크가 있어요. 스마트 컨트랙트 버그, 토큰 가격 폭락 위험이 크죠."
},
{
  id: 50,
  term: "러그풀 (Rug Pull)",
  category: "암호화폐",
  definition: "프로젝트 개발자가 투자금을 갖고 잠적하는 사기 수법이에요. DeFi에서 자주 일어나죠.",
  example: "Squid Game 코인이 2021년 300배 상승 후 개발자가 돈을 들고 사라진 게 대표적이에요.",
  tip: "감사받지 않은 프로젝트, 익명 팀, 과도한 수익률 약속은 위험 신호예요."
},

// === ETF (15개) ===
{
  id: 51,
  term: "ETF란?",
  category: "ETF",
  definition: "Exchange Traded Fund. 주식처럼 거래소에서 사고팔 수 있는 펀드예요. 여러 주식을 묶어서 하나의 상품으로 만든 거죠.",
  example: "SPY ETF 1주를 사면 S&P 500에 속한 500개 기업에 분산 투자하는 효과가 있어요.",
  tip: "개별 주식보다 리스크가 낮고, 펀드보다 수수료가 저렴해서 초보자에게 좋아요."
},
{
  id: 52,
  term: "SPY (S&P 500 ETF)",
  category: "ETF",
  definition: "S&P 500 지수를 추종하는 세계에서 가장 큰 ETF예요. 미국 대형주 500개에 투자하죠.",
  example: "애플, 마이크로소프트, 아마존 등 주요 기업들이 포함돼 있어요.",
  tip: "미국 경제 전체에 투자하고 싶다면 SPY가 가장 무난한 선택이에요."
},
{
  id: 53,
  term: "QQQ (나스닥 100 ETF)",
  category: "ETF",
  definition: "나스닥 100 지수를 추종하는 ETF예요. 주로 기술주 중심으로 구성돼 있죠.",
  example: "애플, 마이크로소프트, 테슬라, 엔비디아 등 테크 기업 비중이 높아요.",
  tip: "SPY보다 변동성이 크지만, 기술주 상승장에선 수익률이 더 좋아요."
},
{
  id: 54,
  term: "VOO (Vanguard S&P 500)",
  category: "ETF",
  definition: "뱅가드가 운용하는 S&P 500 ETF예요. SPY와 거의 동일하지만 수수료가 조금 더 저렴해요.",
  example: "SPY 운용보수 0.09%, VOO 0.03%로 장기 투자엔 VOO가 유리해요.",
  tip: "차이가 크진 않지만, 장기 투자라면 수수료가 낮은 VOO를 선택하는 게 좋아요."
},
{
  id: 55,
  term: "VTI (전체 미국 주식)",
  category: "ETF",
  definition: "미국 전체 주식시장에 투자하는 ETF예요. 대형주부터 소형주까지 약 4,000개 기업이 포함돼 있죠.",
  example: "S&P 500은 대형주 500개지만, VTI는 중소형주도 포함해요.",
  tip: "가장 광범위한 미국 주식 분산 투자 효과를 원한다면 VTI가 최선이에요."
},
{
  id: 56,
  term: "섹터 ETF",
  category: "ETF",
  definition: "특정 산업 섹터에만 집중 투자하는 ETF예요. 11개 섹터로 나뉘죠.",
  example: "기술(XLK), 헬스케어(XLV), 금융(XLF), 에너지(XLE) 등이 있어요.",
  tip: "특정 산업이 호황일 때 집중 투자할 수 있지만, 리스크도 커요."
},
{
  id: 57,
  term: "테크 ETF (VGT, XLK)",
  category: "ETF",
  definition: "기술 섹터 기업들에 투자하는 ETF예요. 애플, 마이크로소프트, 엔비디아 등이 포함돼요.",
  example: "VGT는 뱅가드, XLK는 SPDR에서 운용해요.",
  tip: "AI, 클라우드 등 기술 트렌드에 투자하고 싶다면 테크 ETF가 좋아요."
},
{
  id: 58,
  term: "헬스케어 ETF (VHT, XLV)",
  category: "ETF",
  definition: "제약, 바이오, 의료기기 기업들에 투자하는 ETF예요.",
  example: "존슨앤드존슨, 화이자, 유나이티드헬스 등이 포함돼요.",
  tip: "경기 방어주 성격이 강해서 하락장에도 상대적으로 안정적이에요."
},
{
  id: 59,
  term: "금융 ETF (VFH, XLF)",
  category: "ETF",
  definition: "은행, 보험, 증권사 등 금융 기업들에 투자하는 ETF예요.",
  example: "JP모건, 뱅크오브아메리카, 웰스파고 등이 포함돼요.",
  tip: "금리 상승기에 강하지만, 금융위기에는 큰 타격을 받아요."
},
{
  id: 60,
  term: "에너지 ETF (VDE, XLE)",
  category: "ETF",
  definition: "석유, 가스, 신재생에너지 기업들에 투자하는 ETF예요.",
  example: "엑손모빌, 셰브론 등 전통 에너지 기업이 주를 이뤄요.",
  tip: "유가 상승장에 강하지만 변동성이 매우 커요."
},
{
  id: 61,
  term: "배당 ETF (VYM, SCHD)",
  category: "ETF",
  definition: "배당을 꾸준히 지급하는 우량 기업들에 투자하는 ETF예요.",
  example: "SCHD는 연 3-4% 배당수익률에 배당 성장률도 높아서 인기 많아요.",
  tip: "불마켓에선 수익률이 낮지만, 안정적인 현금흐름을 원한다면 좋은 선택이에요."
},
{
  id: 62,
  term: "레버리지 ETF",
  category: "ETF",
  definition: "기초 지수 수익률의 2배 또는 3배로 움직이는 ETF예요. 파생상품을 활용하죠.",
  example: "TQQQ는 나스닥의 3배 레버리지 ETF예요. 나스닥이 1% 오르면 3% 올라요.",
  tip: "수익도 3배지만 손실도 3배예요. 장기 보유하면 복리 효과로 손실이 커질 수 있어요."
},
{
  id: 63,
  term: "인버스 ETF",
  category: "ETF",
  definition: "기초 지수가 하락하면 수익이 나는 ETF예요. 베어마켓에서 수익을 낼 수 있죠.",
  example: "SQQQ는 나스닥의 -3배 ETF예요. 나스닥이 1% 떨어지면 3% 올라요.",
  tip: "헷지 목적으로 단기 사용은 가능하지만, 장기 보유는 절대 금물이에요."
},
{
  id: 64,
  term: "채권 ETF",
  category: "ETF",
  definition: "국채나 회사채에 투자하는 ETF예요. 주식보다 안정적이지만 수익률은 낮죠.",
  example: "TLT는 20년 이상 미국 국채 ETF, AGG는 미국 전체 채권시장 ETF예요.",
  tip: "금리 하락기에 채권 가격이 올라서 수익을 낼 수 있어요."
},
{
  id: 65,
  term: "국제 ETF (VXUS, VEA)",
  category: "ETF",
  definition: "미국 외 전세계 주식에 투자하는 ETF예요.",
  example: "VXUS는 선진국+신흥국, VEA는 선진국만 투자해요.",
  tip: "미국 집중도를 낮추고 글로벌 분산 투자 효과를 원한다면 고려하세요."
},
// === 경제 지표 (25개) ===
{
    id: 66,
    term: "GDP (국내총생산)",
    category: "경제지표",
    definition: "한 나라가 일정 기간 동안 생산한 모든 재화와 서비스의 총합이에요. 경제 규모를 나타내는 가장 중요한 지표죠.",
    example: "미국 GDP가 전년 대비 3% 성장하면 경제가 건강하다는 신호예요.",
    tip: "GDP 성장률이 높으면 주식시장도 강세를 보이는 경향이 있어요."
  },
  {
    id: 67,
    term: "CPI (소비자물가지수)",
    category: "경제지표",
    definition: "일반 가정이 구매하는 상품과 서비스 가격의 평균 변화를 측정하는 지표예요. 인플레이션을 파악할 수 있죠.",
    example: "CPI가 전년 대비 5% 올랐다면 물가가 5% 상승했다는 뜻이에요.",
    tip: "CPI가 높으면 연준이 금리를 올릴 가능성이 커져서 주식시장엔 악재예요."
  },
  {
    id: 68,
    term: "PPI (생산자물가지수)",
    category: "경제지표",
    definition: "생산자가 판매하는 상품과 서비스 가격의 변화를 측정하는 지표예요. CPI보다 먼저 움직이는 선행지표죠.",
    example: "PPI가 오르면 몇 달 후 CPI도 따라 오르는 경향이 있어요.",
    tip: "기업들의 생산 비용 압박을 미리 파악할 수 있어요."
  },
  {
    id: 69,
    term: "기준금리",
    category: "경제지표",
    definition: "중앙은행이 시중은행에 돈을 빌려줄 때 적용하는 기준 금리예요. 모든 금리의 기준이 되죠.",
    example: "연준이 기준금리를 5.5%로 올리면 대출금리, 예금금리가 모두 올라요.",
    tip: "금리가 오르면 채권 가격은 떨어지고, 주식은 부담을 받아요."
  },
  {
    id: 70,
    term: "연준 (Federal Reserve)",
    category: "경제지표",
    definition: "미국의 중앙은행이에요. 금리 결정, 통화정책으로 미국 경제를 조절하죠.",
    example: "파월 의장이 이끄는 연준은 2022-2023년 공격적 금리 인상을 단행했어요.",
    tip: "연준 의장 발언은 시장에 즉각 영향을 주니 FOMC 회의를 주목하세요."
  },
  {
    id: 71,
    term: "FOMC 회의",
    category: "경제지표",
    definition: "연준의 금리 결정 회의예요. 1년에 8번 열리며, 여기서 기준금리가 결정돼요.",
    example: "FOMC에서 금리 동결을 결정하면 시장은 안도 랠리를 보일 수 있어요.",
    tip: "회의 후 발표되는 성명서와 파월 의장 기자회견을 꼼꼼히 보세요."
  },
  {
    id: 72,
    term: "양적완화 (QE)",
    category: "경제지표",
    definition: "중앙은행이 국채나 자산을 대량 매입해서 시중에 돈을 풀어주는 정책이에요.",
    example: "2020년 코로나 때 연준이 QE로 $4조를 풀어서 주식시장이 폭등했어요.",
    tip: "QE는 주식시장에 호재지만, 인플레이션 위험이 있어요."
  },
  {
    id: 73,
    term: "양적긴축 (QT)",
    category: "경제지표",
    definition: "중앙은행이 보유한 자산을 매각하거나 만기 재투자를 중단해서 시중 통화량을 줄이는 정책이에요.",
    example: "2022년 연준이 QT를 시작하면서 주식시장이 하락했어요.",
    tip: "QT는 시장 유동성을 줄여서 주가에 악재로 작용해요."
  },
  {
    id: 74,
    term: "실업률",
    category: "경제지표",
    definition: "일할 의사가 있는데 일자리를 찾지 못한 사람의 비율이에요. 경제 건강도를 보여주죠.",
    example: "미국 실업률이 3.5%면 거의 완전고용 상태예요.",
    tip: "실업률이 낮으면 경제가 좋다는 신호지만, 너무 낮으면 임금 상승으로 인플레이션을 유발할 수 있어요."
  },
  {
    id: 75,
    term: "고용지표 (Non-Farm Payroll)",
    category: "경제지표",
    definition: "농업 부문을 제외한 미국 전체 일자리 증감을 나타내는 지표예요. 매달 첫째 주 금요일에 발표돼요.",
    example: "NFP가 예상치 30만보다 높은 50만이 나오면 주식이 상승할 수 있어요.",
    tip: "시장 예상치와의 차이가 중요해요. 발표 직후 시장 변동성이 매우 커져요."
  },
  {
    id: 76,
    term: "PMI (구매관리자지수)",
    category: "경제지표",
    definition: "제조업이나 서비스업 구매관리자들의 경기 체감도를 조사한 지표예요. 50이 기준선이죠.",
    example: "PMI 55면 경기 확장, 45면 경기 위축을 의미해요.",
    tip: "실제 경제 데이터보다 먼저 나오는 선행지표라 중요해요."
  },
  {
    id: 77,
    term: "소비자신뢰지수",
    category: "경제지표",
    definition: "소비자들이 현재 경제와 미래 경제를 얼마나 긍정적으로 보는지 조사한 지표예요.",
    example: "지수가 100 이상이면 소비자들이 낙관적이라는 뜻이에요.",
    tip: "소비자 지출이 GDP의 70%를 차지하니 이 지표가 중요해요."
  },
  {
    id: 78,
    term: "무역수지",
    category: "경제지표",
    definition: "수출액에서 수입액을 뺀 값이에요. 플러스면 무역흑자, 마이너스면 무역적자죠.",
    example: "한국은 보통 무역흑자, 미국은 무역적자 국가예요.",
    tip: "무역적자가 커지면 자국 통화 가치가 떨어질 수 있어요."
  },
  {
    id: 79,
    term: "경상수지",
    category: "경제지표",
    definition: "무역수지에 서비스수지, 소득수지, 이전소득을 합한 지표예요. 종합적인 대외거래 상황을 보여주죠.",
    example: "한국이 경상수지 흑자를 기록하면 원화 강세 압력이 생겨요.",
    tip: "무역수지보다 포괄적인 개념이에요."
  },
  {
    id: 80,
    term: "환율",
    category: "경제지표",
    definition: "한 나라 화폐와 다른 나라 화폐의 교환 비율이에요.",
    example: "달러-원 환율이 1,300원이면 1달러를 1,300원에 살 수 있다는 뜻이에요.",
    tip: "환율이 오르면 수출 기업에 유리하고, 내리면 수입 기업에 유리해요."
  },
  {
    id: 81,
    term: "달러 인덱스",
    category: "경제지표",
    definition: "주요 6개 통화 대비 달러 가치를 종합한 지수예요. 달러 강세를 측정하죠.",
    example: "달러 인덱스가 105를 넘으면 달러 강세장이에요.",
    tip: "달러가 강해지면 신흥국 주식과 금, 원자재 가격이 떨어지는 경향이 있어요."
  },
  {
    id: 82,
    term: "VIX 지수 (공포지수)",
    category: "경제지표",
    definition: "S&P 500 옵션 가격으로 계산한 변동성 지수예요. 시장의 불안감을 나타내죠.",
    example: "VIX가 30 이상이면 시장이 매우 불안한 상태예요.",
    tip: "VIX가 낮을수록 시장이 안정적이에요. 20 이하면 안정, 40 이상이면 패닉 상태죠."
  },
  {
    id: 83,
    term: "수익률 곡선",
    category: "경제지표",
    definition: "만기별 국채 수익률을 선으로 연결한 그래프예요. 경제 전망을 예측할 수 있죠.",
    example: "정상적으론 장기 국채 수익률이 단기보다 높아요.",
    tip: "역전되면 경기침체 신호로 봐요."
  },
  {
    id: 84,
    term: "장단기 금리차",
    category: "경제지표",
    definition: "10년물 국채 금리에서 2년물 금리를 뺀 값이에요. 경기 선행지표로 활용되죠.",
    example: "금리차가 마이너스면 수익률 곡선이 역전됐다는 뜻이에요.",
    tip: "역전 후 6-18개월 내 경기침체가 올 확률이 높아요."
  },
  {
    id: 85,
    term: "인플레이션",
    category: "경제지표",
    definition: "물가가 지속적으로 상승하는 현상이에요. 돈의 가치가 떨어지는 거죠.",
    example: "2022년 미국 인플레이션율이 9%를 넘어서 40년 만에 최고치를 기록했어요.",
    tip: "적정 인플레이션은 2% 전후예요. 너무 높으면 소비 위축, 너무 낮으면 디플레이션 위험이 있어요."
  },
  {
    id: 86,
    term: "디플레이션",
    category: "경제지표",
    definition: "물가가 지속적으로 하락하는 현상이에요. 경제활동이 위축되는 신호죠.",
    example: "일본이 1990년대 잃어버린 30년 동안 디플레이션을 겪었어요.",
    tip: "디플레이션은 인플레이션보다 더 위험해요. 소비 지연으로 경제가 마비될 수 있어요."
  },
  {
    id: 87,
    term: "스태그플레이션",
    category: "경제지표",
    definition: "경기 침체와 물가 상승이 동시에 일어나는 최악의 상황이에요.",
    example: "1970년대 석유파동 때 전세계가 스태그플레이션을 겪었어요.",
    tip: "금리 인상으로도 해결 안 돼서 정책 딜레마에 빠져요."
  },
  {
    id: 88,
    term: "경기침체 (Recession)",
    category: "경제지표",
    definition: "GDP가 2분기 연속 마이너스 성장을 기록하는 상태예요. 경제 활동이 위축되는 거죠.",
    example: "2008년 금융위기와 2020년 코로나가 대표적인 경기침체예요.",
    tip: "경기침체 직전에 주식을 매도하고, 바닥에서 매수하는 게 이상적이지만 타이밍 잡기가 어려워요."
  },
  {
    id: 89,
    term: "베이비스텝 (금리 0.25% 인상)",
    category: "경제지표",
    definition: "연준이 기준금리를 0.25%포인트 올리는 걸 베이비스텝이라고 불러요.",
    example: "경기가 안정적일 때 점진적 금리 인상으로 베이비스텝을 사용해요.",
    tip: "시장에 미치는 충격이 적어서 주가 하락폭이 제한적이에요."
  },
  {
    id: 90,
    term: "빅스텝 (금리 0.5% 인상)",
    category: "경제지표",
    definition: "연준이 기준금리를 0.5%포인트 올리는 걸 빅스텝이라고 불러요. 인플레이션이 심할 때 사용하죠.",
    example: "2022년 연준이 40년 만에 빅스텝을 여러 차례 단행했어요.",
    tip: "빅스텝 이상은 시장에 큰 충격을 주니 주의가 필요해요."
  },

  // === 재무제표 (20개) ===
  {
    id: 91,
    term: "재무제표란?",
    category: "재무제표",
    definition: "기업의 재무 상태와 경영 성과를 숫자로 나타낸 보고서예요. 크게 3가지가 있죠.",
    example: "손익계산서, 대차대조표, 현금흐름표가 3대 재무제표예요.",
    tip: "투자 전 반드시 확인해야 할 기본 자료예요. 분기마다 공시돼요."
  },
  {
    id: 92,
    term: "손익계산서",
    category: "재무제표",
    definition: "일정 기간 동안 기업이 얼마를 벌고 얼마를 썼는지 보여주는 표예요. 수익성을 파악할 수 있죠.",
    example: "매출 $100억, 비용 $80억이면 순이익 $20억이 남아요.",
    tip: "매출, 영업이익, 순이익이 모두 증가하는 기업이 좋은 투자처예요."
  },
  {
    id: 93,
    term: "대차대조표",
    category: "재무제표",
    definition: "특정 시점의 기업 자산, 부채, 자본을 보여주는 표예요. 재무 건전성을 파악할 수 있죠.",
    formula: "자산 = 부채 + 자본",
    example: "자산 $100억, 부채 $40억이면 자본은 $60억이에요.",
    tip: "자산이 많고 부채가 적을수록 안전한 기업이에요."
  },
  {
    id: 94,
    term: "현금흐름표",
    category: "재무제표",
    definition: "일정 기간 동안 기업의 현금 유입과 유출을 보여주는 표예요. 실제 돈의 흐름을 알 수 있죠.",
    example: "영업활동으로 $50억 벌고, 투자로 $30억 쓰고, 재무활동으로 $10억 빌렸어요.",
    tip: "영업활동 현금흐름이 플러스인 기업이 건강해요. 순이익은 많은데 현금흐름이 마이너스면 위험해요."
  },
  {
    id: 95,
    term: "매출액",
    category: "재무제표",
    definition: "기업이 상품이나 서비스를 팔아서 벌어들인 총수입이에요.",
    example: "애플이 아이폰 1억대를 $1,000에 팔면 매출은 $1,000억이에요.",
    tip: "매출이 꾸준히 증가하는 기업이 성장성이 좋아요. 하지만 이익도 함께 봐야 해요."
  },
  {
    id: 96,
    term: "영업이익",
    category: "재무제표",
    definition: "매출에서 매출원가와 판관비를 뺀 본업에서 벌어들인 이익이에요.",
    formula: "영업이익 = 매출 - 매출원가 - 판관비",
    example: "매출 $100억, 원가 $60억, 판관비 $20억이면 영업이익은 $20억이에요.",
    tip: "영업이익률이 높을수록 본업 경쟁력이 강해요."
  },
  {
    id: 97,
    term: "당기순이익",
    category: "재무제표",
    definition: "모든 수익과 비용을 계산한 후 최종적으로 남은 이익이에요. 주주들의 몫이죠.",
    example: "영업이익 $20억에서 이자 $2억, 세금 $3억 빼면 순이익은 $15억이에요.",
    tip: "EPS 계산의 기준이 되는 중요한 지표예요."
  },
  {
    id: 98,
    term: "자산",
    category: "재무제표",
    definition: "기업이 소유한 모든 재산이에요. 유동자산과 고정자산으로 나뉘죠.",
    example: "현금, 재고, 건물, 기계, 특허권 등이 자산이에요.",
    tip: "자산이 많다고 무조건 좋은 건 아니에요. 효율적으로 활용하는지가 중요하죠."
  },
  {
    id: 99,
    term: "부채",
    category: "재무제표",
    definition: "기업이 갚아야 할 빚이에요. 유동부채와 비유동부채로 나뉘죠.",
    example: "은행 대출, 미지급금, 회사채 등이 부채예요.",
    tip: "부채가 너무 많으면 이자 부담이 커져서 위험해요."
  },
  {
    id: 100,
    term: "자본",
    category: "재무제표",
    definition: "자산에서 부채를 뺀 순수한 기업 가치예요. 주주 지분이죠.",
    formula: "자본 = 자산 - 부채",
    example: "자산 $100억, 부채 $40억이면 자본은 $60억이에요.",
    tip: "자본이 많을수록 재무 건전성이 높아요."
  },
  {
    id: 101,
    term: "유동자산",
    category: "재무제표",
    definition: "1년 이내에 현금으로 바꿀 수 있는 자산이에요.",
    example: "현금, 단기 예금, 매출채권, 재고자산 등이 유동자산이에요.",
    tip: "유동자산이 많으면 단기 지급 능력이 좋아요."
  },
  {
    id: 102,
    term: "고정자산",
    category: "재무제표",
    definition: "1년 이상 장기간 사용할 목적으로 보유한 자산이에요.",
    example: "토지, 건물, 기계, 특허권 등이 고정자산이에요.",
    tip: "제조업은 고정자산 비중이 높고, IT업은 낮은 편이에요."
  },
  {
    id: 103,
    term: "유동부채",
    category: "재무제표",
    definition: "1년 이내에 갚아야 하는 빚이에요.",
    example: "단기 차입금, 미지급금, 선수금 등이 유동부채예요.",
    tip: "유동자산이 유동부채보다 많아야 단기 자금난이 없어요."
  },
  {
    id: 104,
    term: "비유동부채",
    category: "재무제표",
    definition: "1년 후에 갚아도 되는 장기 빚이에요.",
    example: "장기 차입금, 회사채, 퇴직급여충당부채 등이 비유동부채예요.",
    tip: "장기부채가 너무 많으면 이자 부담이 커요."
  },
  {
    id: 105,
    term: "영업활동 현금흐름",
    category: "재무제표",
    definition: "본업을 통해 벌어들인 실제 현금이에요. 가장 중요한 현금흐름이죠.",
    example: "제품 판매로 $100억 받고, 원재료 구매로 $60억 썼다면 영업활동 현금흐름은 $40억이에요.",
    tip: "영업활동 현금흐름이 꾸준히 플러스면 건강한 기업이에요."
  },
  {
    id: 106,
    term: "투자활동 현금흐름",
    category: "재무제표",
    definition: "설비 투자나 자산 매각으로 발생한 현금 흐름이에요.",
    example: "새 공장 짓는데 $50억 쓰면 투자활동 현금흐름은 -$50억이에요.",
    tip: "보통 마이너스예요. 성장하는 기업은 투자를 많이 하니까요."
  },
  {
    id: 107,
    term: "재무활동 현금흐름",
    category: "재무제표",
    definition: "돈을 빌리거나 갚고, 배당을 주는 활동에서 발생한 현금 흐름이에요.",
    example: "은행에서 $30억 빌리고 배당으로 $5억 주면 재무활동 현금흐름은 $25억이에요.",
    tip: "계속 플러스면 빚이 늘고 있다는 뜻이라 주의가 필요해요."
  },
  {
    id: 108,
    term: "감가상각비",
    category: "재무제표",
    definition: "건물, 기계 같은 고정자산의 가치가 시간이 지나면서 줄어드는 걸 비용으로 처리하는 거예요.",
    example: "$100억짜리 기계를 10년 쓴다면 매년 $10억씩 감가상각비로 처리해요.",
    tip: "실제 현금이 나가는 건 아니지만 비용으로 인정돼서 세금을 줄여줘요."
  },
  {
    id: 109,
    term: "무형자산",
    category: "재무제표",
    definition: "물리적 형태는 없지만 가치가 있는 자산이에요.",
    example: "특허권, 상표권, 영업권, 소프트웨어 등이 무형자산이에요.",
    tip: "IT 기업은 무형자산 비중이 높아요. 구글의 검색 알고리즘, 애플의 브랜드 가치 등이죠."
  },
  {
    id: 110,
    term: "이익잉여금",
    category: "재무제표",
    definition: "회사가 설립 후 지금까지 벌어들인 순이익에서 배당을 빼고 쌓아둔 돈이에요.",
    example: "누적 순이익 $100억, 누적 배당 $30억이면 이익잉여금은 $70억이에요.",
    tip: "이익잉여금이 많으면 재무가 튼튼하고 배당 여력도 커요."
  },

  // === 앱 용어 (10개) ===
  {
    id: 111,
    term: "감성 분석",
    category: "앱용어",
    definition: "뉴스나 SNS 글의 긍정/부정 정도를 AI로 분석해서 시장 심리를 파악하는 기능이에요.",
    example: "테슬라 관련 뉴스가 80% 긍정적이면 주가 상승 가능성이 높아요.",
    tip: "이 앱의 뉴스 페이지에서 감성 점수를 확인할 수 있어요. 50% 이상이면 긍정이에요."
  },
  {
    id: 112,
    term: "볼린저 밴드",
    category: "앱용어",
    definition: "주가의 이동평균선 위아래로 표준편차를 더한 밴드예요. 과매수/과매도 판단에 사용하죠.",
    example: "주가가 상단 밴드를 터치하면 과매수, 하단 밴드면 과매도 신호예요.",
    tip: "SNS 상세 페이지의 차트에서 볼린저 밴드를 볼 수 있어요. 밴드 폭이 좁아지면 큰 변동 전조예요."
  },
  {
    id: 113,
    term: "이동평균선",
    category: "앱용어",
    definition: "일정 기간 동안의 평균 주가를 선으로 연결한 거예요. 추세를 파악할 수 있죠.",
    example: "20일 이동평균선은 최근 20일 주가의 평균이에요.",
    tip: "단기 이평선이 장기 이평선을 위로 뚫으면 골든크로스로 매수 신호예요."
  },
  {
    id: 114,
    term: "거래량 급증",
    category: "앱용어",
    definition: "평소보다 거래량이 크게 늘어난 걸 말해요. 중요한 뉴스나 이벤트가 있다는 신호죠.",
    example: "평소 100만주 거래되던 종목이 갑자기 500만주 거래되면 거래량 급증이에요.",
    tip: "SNS 분석 페이지에서 거래량 급증 구간을 확인할 수 있어요. 보통 가격변동과 함께 일어나요."
  },
  {
    id: 115,
    term: "TopGainers (상승률 상위)",
    category: "앱용어",
    definition: "특정 기간 동안 가장 많이 오른 종목들을 보여주는 순위예요.",
    example: "오늘 상승률 1위가 NVDA +8.5%라면 TopGainers 1위예요.",
    tip: "홈 화면 상단 배너에서 실시간 TopGainers를 확인할 수 있어요. 여기서 핫한 종목을 빠르게 파악하세요!"
  },
  {
    id: 116,
    term: "실적 발표 (Earnings)",
    category: "앱용어",
    definition: "기업이 분기마다 매출, 이익 등 경영 실적을 공개하는 이벤트예요. 주가에 큰 영향을 줘요.",
    example: "애플이 예상을 뛰어넘는 실적을 발표하면 주가가 10% 이상 급등할 수 있어요.",
    tip: "경제 캘린더에서 주요 기업들의 실적 발표 일정을 미리 확인하세요!"
  },
  {
    id: 117,
    term: "IPO (기업공개)",
    category: "앱용어",
    definition: "비상장 기업이 처음으로 주식을 공개 발행해서 증시에 상장하는 거예요.",
    example: "2024년 레딧이 IPO로 상장했어요.",
    tip: "경제 캘린더에서 예정된 IPO 일정을 확인할 수 있어요. 상장 첫날은 변동성이 매우 커요."
  },
  {
    id: 118,
    term: "SNS 시장 영향 분석",
    category: "앱용어",
    definition: "일론 머스크 같은 유명인의 SNS 발언이 시장에 미치는 영향을 분석하는 기능이에요.",
    example: "머스크가 도지코인 관련 트윗하면 가격이 20% 급등하기도 해요.",
    tip: "SNS 페이지에서 영향력 있는 게시물들을 확인하고, 상세 분석으로 실제 가격 변동을 볼 수 있어요."
  },
  {
    id: 119,
    term: "경제 캘린더",
    category: "앱용어",
    definition: "주요 경제 지표 발표, 기업 실적 발표, IPO 등 중요한 일정을 한눈에 보여주는 달력이에요.",
    example: "FOMC 회의, 고용지표 발표, 빅테크 실적 발표 등을 미리 확인할 수 있어요.",
    tip: "홈 화면 하단 캘린더에서 이번 주/이번 달 주요 이벤트를 체크하세요. 날짜별로 이벤트가 표시돼요!"
  },
  {
    id: 120,
    term: "뉴스 감성 점수",
    category: "앱용어",
    definition: "AI가 뉴스 내용을 분석해서 긍정/부정 정도를 점수로 나타낸 거예요.",
    example: "감성 점수 +75%면 매우 긍정적인 뉴스, -60%면 부정적인 뉴스예요.",
    tip: "뉴스 페이지에서 각 기사마다 감성 점수를 확인할 수 있어요. 0%가 중립, +50% 이상이면 강한 긍정이에요."
  }
];

// ============================================================================
// 카테고리 메타데이터
// ============================================================================

const CATEGORIES = [
  { id: "주식기초", label: "주식 기초", icon: "📈", color: "badge-cheatsheet-stock" },
  { id: "암호화폐", label: "암호화폐", icon: "₿", color: "badge-cheatsheet-crypto" },
  { id: "ETF", label: "ETF", icon: "📊", color: "badge-cheatsheet-etf" },
  { id: "경제지표", label: "경제 지표", icon: "🌍", color: "badge-cheatsheet-economy" },
  { id: "재무제표", label: "재무제표", icon: "📋", color: "badge-cheatsheet-finance" },
  { id: "앱용어", label: "앱 용어", icon: "📱", color: "badge-cheatsheet-app" }
] as const;

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function CheatsheetPage({ onBack }: CheatsheetPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<CheatsheetItem | null>(null);

  // 검색 & 필터링
  const filteredItems = useMemo(() => {
    return CHEATSHEET_DATA.filter(item => {
      const matchesSearch = 
        item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === "all" || 
        item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // 카테고리별 통계
  const categoryStats = useMemo(() => {
    const stats = new Map<string, number>();
    CHEATSHEET_DATA.forEach(item => {
      stats.set(item.category, (stats.get(item.category) || 0) + 1);
    });
    return stats;
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg glass hover:glass-strong transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Investment Cheatsheet</h1>
          <div className="w-10" />
        </div>

        {/* 검색바 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
          <Input
            placeholder="용어 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 glass-card border-white/20 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X size={16} className="text-foreground/50" />
            </button>
          )}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "glass-strong"
                : "glass-subtle hover:glass-card"
            }`}
          >
            전체 ({CHEATSHEET_DATA.length})
          </button>
          
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "glass-strong"
                  : "glass-subtle hover:glass-card"
              }`}
            >
              {cat.icon} {cat.label} ({categoryStats.get(cat.id) || 0})
            </button>
          ))}
        </div>

        {/* 검색 결과 통계 */}
        <div className="glass-subtle rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <span className="text-sm font-medium">{filteredItems.length}개 용어</span>
          </div>
          {searchQuery && (
            <span className="text-xs text-foreground/60">
              "{searchQuery}" 검색 결과
            </span>
          )}
        </div>

        {/* 용어 리스트 */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredItems.map((item, index) => {
              const category = CATEGORIES.find(c => c.id === item.category);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedItem(item)}
                  className="glass-card rounded-xl p-4 cursor-pointer hover:glass-strong transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{item.term}</h3>
                      <Badge className={`${category?.color} text-xs`}>
                        {category?.icon} {category?.label}
                      </Badge>
                    </div>
                    <ChevronRight size={20} className="text-foreground/40 shrink-0 mt-1" />
                  </div>
                  
                  <p className="text-sm text-foreground/70 line-clamp-2 leading-relaxed">
                    {item.definition}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-2xl p-8 text-center"
            >
              <Search size={48} className="mx-auto mb-4 text-foreground/20" />
              <h3 className="font-medium mb-2">검색 결과가 없어요</h3>
              <p className="text-sm text-foreground/60">다른 키워드로 검색해보세요!</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* 상세 모달 */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-auto glass-card rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl"
            >

              {/* 카테고리 배지 */}
              <Badge className={`${CATEGORIES.find(c => c.id === selectedItem.category)?.color} mb-3`}>
                {CATEGORIES.find(c => c.id === selectedItem.category)?.icon}{" "}
                {CATEGORIES.find(c => c.id === selectedItem.category)?.label}
              </Badge>

              {/* 제목 */}
              <h2 className="text-2xl font-bold mb-4">{selectedItem.term}</h2>

              {/* 정의 */}
              <div className="glass-card rounded-xl p-4 mb-4">
                <h3 className="text-sm font-medium text-primary mb-2">💡 정의</h3>
                <p className="text-sm leading-relaxed">{selectedItem.definition}</p>
              </div>

              {/* 공식 */}
              {selectedItem.formula && (
                <div className="glass-card rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-green-400 mb-2">📐 공식</h3>
                  <code className="text-sm font-mono bg-black/30 px-3 py-2 rounded-lg block">
                    {selectedItem.formula}
                  </code>
                </div>
              )}

              {/* 예시 */}
              {selectedItem.example && (
                <div className="glass-card rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-yellow-400 mb-2">📝 예시</h3>
                  <p className="text-sm leading-relaxed">{selectedItem.example}</p>
                </div>
              )}

              {/* 팁 */}
              {selectedItem.tip && (
                <div className="glass-strong rounded-xl p-4">
                  <h3 className="text-sm font-medium text-primary mb-2">💡 활용 팁</h3>
                  <p className="text-sm leading-relaxed text-foreground/90">{selectedItem.tip}</p>
                </div>
              )}

              {/* 닫기 버튼 */}
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full mt-6 py-3 glass-card rounded-xl hover:glass-strong transition-all font-medium"
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}