"use client";
import { useState } from "react";
import { savePacket } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { PACKET, SILSON24_URL } from "@/lib/packet";
import type { Reason } from "@/lib/benefits";
import type { SilsonHospital } from "@/lib/silson";
import { useAct } from "@/components/useAct";
import Sheet from "@/components/Sheet";

const S24 = [["yes", "전산 청구가 돼요"], ["no", "안 돼요"], ["", "아직 몰라요"]] as const;

const QUICK_DOC_SUGGESTIONS = [
  "수술확인서 (수술비 청구)",
  "진료확인서 / 통원확인서",
  "의사소견서 (비급여 사유)",
  "검사결과지 (조직·영상)",
  "응급실 진료기록부",
];

export default function PacketForm({
  auth,
  hospital,
  silson24,
  checked,
  scannedDocs = [],
  customDocs = [],
  patientReason = "other",
  post = false,
}: {
  auth: Auth;
  hospital: string;
  silson24: "yes" | "no" | null;
  checked: string[];
  scannedDocs?: string[];
  customDocs?: string[];
  patientReason?: Reason;
  post?: boolean; // 이미 퇴원한 뒤(온라인·전화·방문 발급)인지
}) {
  const [name, setName] = useState(hospital);
  const [s24, setS24] = useState<string>(silson24 ?? "");
  const [sel, setSel] = useState(checked);
  const [customList, setCustomList] = useState<string[]>(customDocs);
  const [newDocText, setNewDocText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SilsonHospital[] | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [show, setShow] = useState(false); // 창구에서 보여주기 화면

  const { run, pending, err } = useAct();
  const save = (h: string, s: string, c: string[], cl?: string[]) =>
    run(() => savePacket(auth, h, s || null, c, cl ?? customList));

  const toggle = (id: string) => {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
    setSel(next);
    save(name, s24, next, customList);
  };

  const handleAddCustom = (docName: string) => {
    const trimmed = docName.trim();
    if (!trimmed || customList.includes(trimmed)) return;
    const next = [...customList, trimmed];
    setCustomList(next);
    setNewDocText("");
    save(name, s24, sel, next);
  };

  const handleRemoveCustom = (docName: string) => {
    const nextList = customList.filter((x) => x !== docName);
    const nextSel = sel.filter((x) => x !== docName);
    setCustomList(nextList);
    setSel(nextSel);
    save(name, s24, nextSel, nextList);
  };

  const isSevereIllness = patientReason === "cancer" || patientReason === "brain" || patientReason === "heart";

  // 창구 직원에게 보여줄 미발급 서류 목록
  const unissuedStandard = PACKET.filter((p) => !sel.includes(p.id)).map((p) => p.name);
  const unissuedCustom = customList.filter((c) => !sel.includes(c));
  const unissuedTotal = [...unissuedStandard, ...unissuedCustom];
  const totalCount = PACKET.length + customList.length;

  const handleSearch = async () => {
    const q = name.trim();
    if (q.length < 2) {
      setSearchMsg("병원 이름을 2글자 이상 입력해 주세요");
      return;
    }
    setSearching(true);
    setSearchMsg(null);
    setSearchResults(null);

    try {
      const res = await fetch(`/api/silson?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.ok) {
        setSearchMsg(data.message || "조회에 실패했어요");
        return;
      }

      const list: SilsonHospital[] = data.hospitals ?? [];
      setSearchResults(list);

      if (list.length === 1) {
        const target = list[0];
        setName(target.name);
        setS24("yes");
        save(target.name, "yes", sel, customList);
        setSearchMsg(`'${target.name}'은 실손24로 청구할 수 있는 병원이에요`);
      } else if (list.length > 1) {
        setSearchMsg(`실손24 참여 병원 ${list.length}곳이 검색되었어요. 해당 병원을 선택해 주세요.`);
      } else {
        // 이름이 조금만 달라도 못 찾을 수 있어 '미참여'로 단정해 저장하지 않는다
        setSearchMsg("실손24 참여 병원 목록에서 찾지 못했어요. 병원 이름을 바꿔 다시 찾거나, 아래에서 직접 골라 주세요. 참여하지 않는 병원이면 퇴원 전에 서류 4종을 꼭 받아 두세요.");
      }
    } catch {
      setSearchMsg("일시적으로 조회가 원활하지 않아요. 수동으로 선택하거나 공식 사이트를 확인해 주세요.");
    } finally {
      setSearching(false);
    }
  };

  const pickHospital = (h: SilsonHospital) => {
    setName(h.name);
    setS24("yes");
    save(h.name, "yes", sel, customList);
    setSearchResults(null);
    setSearchMsg(`'${h.name}'을 실손24 청구 가능 병원으로 저장했어요`);
  };

  return (
    <>
      <section className="mt-6" aria-labelledby="p2">
        <div className="flex items-center justify-between gap-2">
          <h2 id="p2" className="font-semibold text-headline">
            {post ? "병원에 요청할 서류" : "원무과에서 받을 서류"} ({sel.length}/{totalCount})
          </h2>
          <button type="button" onClick={() => setShow(true)} className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            {post ? "요청할 때 보여주기" : "창구에서 보여주기"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">받은 서류는 체크해 두세요</p>

        {scannedDocs.length > 0 && (
          <aside className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent" aria-label="보관함 연동 안내">
            <p className="font-semibold text-xs tracking-wide uppercase">내 서류함 확인</p>
            <p className="mt-0.5">
              내 서류함에 이미 찍어 둔 서류가 있어요. 남은 서류 위주로 {post ? "병원에 요청하시면" : "원무과에서 챙기시면"} 돼요.
            </p>
          </aside>
        )}

        {/* 서류 체크리스트 */}
        <ul className={`mt-3 divide-y divide-line rounded-xl bg-card shadow-card ${pending ? "opacity-70" : ""}`}>
          {PACKET.map((p) => {
            const isScanned = scannedDocs.includes(p.id);
            const isChecked = sel.includes(p.id);
            const isCert = p.id === "disabled_cert";

            return (
              <li key={p.id}>
                <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(p.id)}
                    className="mt-1 h-5 w-5 shrink-0 accent-primary"
                  />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${isChecked ? "text-muted line-through" : ""}`}>{p.name}</span>
                      {isCert && (
                        <span className={`rounded-md px-2 py-0.5 text-caption font-semibold ${
                          isSevereIllness ? "bg-accent-soft text-accent" : "bg-[#fff4cc] text-[#7a5a00]"
                        }`}>
                          {isSevereIllness ? "중증환자 해당 시 권장" : "중증환자 전용 (확인 필요)"}
                        </span>
                      )}
                      {isScanned && (
                        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-caption font-semibold text-accent">
                          서류함에 있음
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {isCert
                        ? isSevereIllness
                          ? "암·뇌혈관·심장 등 항시 치료가 필요한 중증환자로 인정 시 발급돼요 (연 200만 원 소득공제). 퇴원 전 주치의에게 확인 후 원무과에서 발급받으세요."
                          : "암·뇌·심장 등 중증질환 치료 환자만 발급 대상이에요. 일반 골절·단순 수술 환자는 발급되지 않으니 주치의에게 먼저 문의하세요."
                        : p.note}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}

          {/* 사용자가 직접 추가한 커스텀 서류 목록 */}
          {customList.map((docName) => {
            const isChecked = sel.includes(docName);
            return (
              <li key={docName} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(docName)}
                  className="mt-1 h-5 w-5 shrink-0 accent-primary"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`font-medium ${isChecked ? "text-muted line-through" : ""}`}>{docName}</span>
                    <span className="rounded-md bg-primary/20 px-2 py-0.5 text-caption font-semibold text-ink">
                      직접 추가
                    </span>
                  </span>
                  <span className="block text-xs text-muted">내가 직접 추가한 퇴원 서류</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveCustom(docName)}
                  className="p-1 text-xs text-muted hover:text-warn"
                  title="서류 삭제"
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>

        {/* 서류 추가: 대부분은 안 쓰므로 접어 둔다 */}
        <details className="mt-3 rounded-xl bg-card shadow-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">+ 필요한 서류 더 추가하기</summary>
          <div className="px-4 pb-4">
            <p className="text-xs text-muted">
              지원받으려는 사업이나 개인 보험에 필요한 추가 서류가 있다면 여기에 적어두세요.
            </p>
            <div className="mt-2.5 flex gap-2">
              <input
                id="new-doc"
                aria-label="추가할 서류 이름"
                value={newDocText}
                maxLength={50}
                onChange={(e) => setNewDocText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustom(newDocText);
                  }
                }}
                placeholder="예: 수술확인서, 의사소견서 등"
                className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => handleAddCustom(newDocText)}
                disabled={!newDocText.trim()}
                className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-ink disabled:opacity-40"
              >
                추가
              </button>
            </div>

            <div className="mt-3">
              <span className="text-xs font-medium text-muted">자주 찾는 추가 서류:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_DOC_SUGGESTIONS.filter((s) => !customList.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddCustom(s)}
                    className="rounded-full border border-line bg-card px-2.5 py-1 text-xs text-ink hover:bg-accent-soft hover:border-accent transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>

        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
      </section>

      {/* 이미 퇴원한 사람이 병원에서 서류를 받는 방법(온라인 → 전화 → 방문 순) */}
      {(() => {
        const body = (
          <ol className="space-y-2.5 text-sm leading-relaxed">
            <li><b className="font-semibold">1. 온라인</b> 병원 홈페이지나 앱의 &lsquo;증명서 발급&rsquo; 메뉴에서 받을 수 있는 병원이 많아요. 가장 빨라요.</li>
            <li><b className="font-semibold">2. 전화</b> 온라인이 안 되면 원무과에 전화해서 방문 발급이나 우편 발급이 되는지 물어보세요.</li>
            <li><b className="font-semibold">3. 방문</b> 환자 본인 신분증을 챙기세요. 가족이 대신 가면 필요한 서류를 전화로 먼저 확인하세요 (병원마다 달라요).</li>
          </ol>
        );
        return post ? (
          <section className="mt-6 rounded-xl bg-card p-4 shadow-card">
            <h2 className="mb-2 font-semibold">이미 퇴원했어도 받을 수 있어요</h2>
            {body}
          </section>
        ) : (
          <details className="mt-6 rounded-xl bg-card shadow-card">
            <summary className="cursor-pointer px-4 py-3 font-semibold">이미 퇴원했다면 이렇게 받아요</summary>
            <div className="px-4 pb-4">{body}</div>
          </details>
        );
      })()}

      <details className="mt-6 rounded-xl bg-card shadow-card">
        <summary className="cursor-pointer px-4 py-3.5">
          <span className="font-semibold">실손24 전산 청구 확인</span>
          <span className="ml-2 text-sm text-muted">{s24 === "yes" ? "청구할 수 있는 병원이에요" : s24 === "no" ? "전산 청구가 안 되는 병원이에요" : "아직 확인하지 않았어요"}</span>
        </summary>
        <div className="px-4 pb-4">
        <p className="text-sm text-muted">입원한 병원을 검색하면 실손24 참여 여부를 바로 확인해 드려요 (공공데이터 기준)</p>

        <label htmlFor="hn" className="mt-3 block text-sm font-medium">입원한 병원</label>
        <div className="mt-1 flex gap-2">
          <input
            id="hn"
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              setSearchResults(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            onBlur={() => name !== hospital && save(name, s24, sel, customList)}
            placeholder="예: 서울대병원, 아산병원, 창원경상대병원"
            className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="shrink-0 rounded-xl bg-primary px-4 py-3 font-semibold text-ink shadow-sm active:opacity-80 disabled:opacity-50"
          >
            {searching ? "조회 중…" : "실손24 조회"}
          </button>
        </div>

        {searchMsg && (
          <p role="status" className={`mt-2 rounded-xl p-3 text-sm ${s24 === "yes" ? "bg-accent-soft text-accent" : s24 === "no" ? "bg-warn-soft text-warn" : "bg-card text-muted shadow-card"}`}>
            {searchMsg}
          </p>
        )}

        {/* 검색 결과 다건 목록 */}
        {searchResults && searchResults.length > 1 && (
          <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-card shadow-card">
            <p className="px-3 py-2 text-xs font-medium text-muted">검색된 실손24 참여 병원 중 선택해 주세요:</p>
            {searchResults.map((h, idx) => (
              <button
                key={`${h.name}-${idx}`}
                type="button"
                onClick={() => pickHospital(h)}
                className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-accent-soft/50"
              >
                <span className="font-semibold text-ink">{h.name} <span className="ml-1 text-xs text-accent">[{h.type || "참여 요양기관"}]</span></span>
                {h.address && <span className="text-xs text-muted">{h.address}</span>}
              </button>
            ))}
          </div>
        )}

        {s24 === "yes" && (
          <p role="status" className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent">
            [전산 청구 지원] 퇴원 후 실손24 앱에서 종이 서류 없이 간편하게 청구할 수 있어요. 그래도 진료비 영수증과 세부내역서는 다른 보험이나 지원금 신청을 위해 챙겨두면 안전해요.
          </p>
        )}
        {s24 === "no" && (
          <p role="status" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn font-medium">
            {post
              ? "[전산 청구 미지원] 종이 서류로 청구해야 해요. 아래 서류를 병원에서 발급받아 보험사에 내세요."
              : "[전산 청구 미지원] 퇴원 날 원무과에서 아래 서류들을 떼지 않으면 보험금을 받지 못하고 병원을 다시 찾아야 해요!"}
          </p>
        )}
        {s24 === "" && (
          <p className="mt-3 text-sm text-muted">
            확인이 어렵다면 아래 서류를 받아 두는 쪽이 안전해요.
          </p>
        )}

        {/* 조회가 되면 자동으로 정해지므로 직접 고르는 버튼과 공식 사이트는 접어 둔다 */}
        <details className="mt-3 rounded-xl bg-background">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">조회가 안 되면 직접 알려주기</summary>
          <div className="px-4 pb-4">
            <div role="radiogroup" aria-label="실손24 지원 여부" className="grid grid-cols-3 gap-2">
              {S24.map(([v, l]) => (
                <button
                  key={l}
                  role="radio"
                  aria-checked={s24 === v}
                  onClick={() => {
                    setS24(v);
                    save(name, v, sel, customList);
                  }}
                  className={`rounded-xl px-2 py-3 text-sm transition-all ${
                    s24 === v ? "bg-accent-soft font-semibold text-accent ring-[1.5px] ring-primary" : "bg-card shadow-card"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <a
              href={SILSON24_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center rounded-full bg-card px-4 py-2.5 text-sm font-medium text-muted shadow-card hover:text-ink"
            >
              실손24 공식 사이트에서 직접 확인하기 ↗
            </a>
          </div>
        </details>
        </div>
      </details>

      {/* 병원 직원에게 그대로 보여 주는 전체 화면: 아직 못 받은 서류만 큰 글씨로 */}
      <Sheet open={show} onClose={() => setShow(false)} title={post ? "병원에 이렇게 요청하세요" : "창구 직원에게 보여주세요"}>
        <p className="text-callout font-semibold leading-relaxed">
          &ldquo;{post ? "퇴원한 환자인데 아래 서류 발급 부탁드립니다." : "퇴원 정산하면서 아래 서류 발급 부탁드립니다."}&rdquo;
        </p>
        {unissuedTotal.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {unissuedTotal.map((item, idx) => (
              <li key={item} className="flex items-start gap-3 text-lg font-semibold text-ink">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-ink">{idx + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-muted">필요한 서류를 모두 챙기셨어요!</p>
        )}
        <p className="mt-4 text-sm text-muted">이미 받은 서류는 목록에서 빠져 있어요</p>
      </Sheet>
    </>
  );
}
