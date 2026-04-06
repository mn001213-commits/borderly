"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import type { Locale } from "@/lib/i18n";

type Section = { title: string; content: string };

const content: Record<Locale, { pageTitle: string; intro: string; effectiveDate: string; contact: string; sections: Section[] }> = {
  ko: {
    pageTitle: "개인정보처리방침",
    intro:
      "Borderly(이하 \"회사\")는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 및 관련 법령을 준수합니다. 본 개인정보처리방침은 회사가 제공하는 Borderly 서비스(이하 \"서비스\") 이용과 관련하여 이용자의 개인정보가 어떻게 수집·이용·보호되는지 안내합니다.",
    effectiveDate: "시행일: 2026년 4월 6일",
    contact: "문의: privacy@borderly.app",
    sections: [
      {
        title: "제1조 (개인정보의 수집 및 이용 목적)",
        content: `회사는 다음의 목적을 위하여 개인정보를 수집 및 이용합니다. 수집된 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경될 경우에는 사전에 이용자의 동의를 구할 것입니다.

① 회원 가입 및 관리: 회원 가입 의사 확인, 본인 식별·인증, 회원자격 유지·관리, 서비스 부정 이용 방지
② 서비스 제공: 콘텐츠 제공, 커뮤니티 기능 제공, 실시간 메시지 서비스, 맞춤형 서비스 제공
③ 민원 처리: 민원인 본인 확인, 민원사항 확인, 처리 결과 통보
④ 마케팅 및 광고 활용: 이벤트 및 공지사항 안내 (동의한 경우에 한함)`,
      },
      {
        title: "제2조 (수집하는 개인정보의 항목)",
        content: `회사는 서비스 이용을 위해 다음과 같은 개인정보를 수집합니다.

■ 필수 수집 항목
• 이메일 주소 (회원 식별 및 로그인용)
• 비밀번호 (암호화 저장)
• 닉네임 (서비스 내 표시명)

■ 선택 수집 항목
• 프로필 사진
• 자기소개 (bio)
• 국적 / 현재 거주 국가
• 사용 언어

■ 서비스 이용 과정에서 자동 수집되는 정보
• 접속 IP 주소, 서비스 이용 기록, 쿠키
• 디바이스 정보 (브라우저 종류, OS 정보)`,
      },
      {
        title: "제3조 (개인정보의 보유 및 이용 기간)",
        content: `회사는 이용자의 개인정보를 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.

■ 회사 내부 방침에 의한 보유
• 부정 이용 방지 기록: 1년

■ 관련 법령에 의한 보유
• 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)
• 소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)
• 접속에 관한 기록: 3개월 (통신비밀보호법)`,
      },
      {
        title: "제4조 (개인정보의 제3자 제공)",
        content: `회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.

① 이용자가 사전에 동의한 경우
② 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우`,
      },
      {
        title: "제5조 (개인정보 처리의 위탁)",
        content: `회사는 원활한 개인정보 업무 처리를 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.

■ Supabase Inc.
• 위탁 업무: 데이터베이스 운영 및 인증 서비스
• 위탁 지역: 미국 (AWS 인프라 기반)
• 보유 기간: 회원 탈퇴 시까지

회사는 위탁 계약 시 개인정보보호법 제26조에 따라 위탁업무 수행 목적 외 개인정보 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독합니다.`,
      },
      {
        title: "제6조 (이용자 및 법정 대리인의 권리와 행사 방법)",
        content: `이용자 및 법정 대리인은 언제든지 등록되어 있는 자신 혹은 당해 만 14세 미만 아동의 개인정보를 조회하거나 수정할 수 있으며, 가입 해지를 요청할 수도 있습니다.

이용자 혹은 만 14세 미만 아동의 개인정보 조회·수정을 위해서는 '프로필 편집'을, 가입 해지(동의 철회)를 위해서는 '회원 탈퇴'를 클릭하여 본인 확인 절차를 거친 후 직접 열람, 정정 또는 탈퇴가 가능합니다.

회사는 이용자 혹은 법정 대리인의 요청에 의해 해지 또는 삭제된 개인정보는 "제3조"에 명시된 바에 따라 처리하고 그 외의 용도로 열람 또는 이용할 수 없도록 처리하고 있습니다.`,
      },
      {
        title: "제7조 (개인정보의 파기)",
        content: `회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.

■ 파기 절차
이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정 기간 저장된 후 혹은 즉시 파기됩니다.

■ 파기 방법
전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.`,
      },
      {
        title: "제8조 (개인정보의 안전성 확보 조치)",
        content: `회사는 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적·관리적 및 물리적 조치를 하고 있습니다.

① 비밀번호의 암호화: 이용자의 비밀번호는 암호화되어 저장 및 관리되고 있어, 본인만이 알 수 있으며 개인정보의 확인 및 변경도 비밀번호를 알고 있는 본인만이 가능합니다.
② 해킹 등에 대비한 기술적 대책: 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위하여 보안프로그램을 설치하고 주기적인 갱신·점검을 실시합니다.
③ 개인정보에 대한 접근 제한: 개인정보를 처리하는 데이터베이스시스템에 대한 접근 권한의 부여, 변경, 말소를 통하여 개인정보에 대한 접근 통제를 위하여 필요한 조치를 하고 있습니다.
④ 전송 구간 암호화: HTTPS(TLS)를 통해 데이터 전송 구간을 암호화합니다.`,
      },
      {
        title: "제9조 (쿠키의 사용)",
        content: `회사는 이용자에게 개별적인 맞춤화된 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.

■ 쿠키의 사용 목적
로그인 세션 유지, 서비스 이용 환경 기억 (언어, 테마 등)

■ 쿠키의 설치·운영 및 거부
이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹 브라우저의 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다. 단, 쿠키 저장을 거부할 경우 일부 서비스 이용에 어려움이 있을 수 있습니다.`,
      },
      {
        title: "제10조 (개인정보 보호책임자)",
        content: `회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

■ 개인정보 보호책임자
• 이름: Borderly 운영팀
• 이메일: privacy@borderly.app

이용자는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.`,
      },
      {
        title: "제11조 (권익 침해 구제 방법)",
        content: `이용자는 개인정보 침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁 해결이나 상담 등을 신청할 수 있습니다.

• 개인정보분쟁조정위원회: www.kopico.go.kr / (국번없이) 1833-6972
• 개인정보침해신고센터: privacy.kisa.or.kr / (국번없이) 118
• 대검찰청 사이버범죄수사단: www.spo.go.kr / 02-3480-3573
• 경찰청 사이버안전국: cyberbureau.police.go.kr / (국번없이) 182`,
      },
      {
        title: "제12조 (개인정보 처리방침의 변경)",
        content: "이 개인정보 처리방침은 2026년 4월 6일부터 적용됩니다.",
      },
    ],
  },

  ja: {
    pageTitle: "プライバシーポリシー",
    intro:
      "Borderly（以下「当社」）は、ユーザーの個人情報を重要視し、個人情報保護法およびその他の関連法令を遵守します。本プライバシーポリシーは、当社が提供するBorderlyサービス（以下「サービス」）の利用に関して、ユーザーの個人情報がどのように収集・利用・保護されるかをご説明します。",
    effectiveDate: "施行日：2026年4月6日",
    contact: "お問い合わせ：privacy@borderly.app",
    sections: [
      {
        title: "第1条（個人情報の収集および利用目的）",
        content: `当社は、以下の目的のために個人情報を収集・利用します。収集された個人情報は、以下の目的以外には利用されず、利用目的が変更される場合は事前にユーザーの同意を求めます。

① 会員登録および管理：会員登録の意思確認、本人識別・認証、会員資格の維持・管理、不正利用の防止
② サービスの提供：コンテンツの提供、コミュニティ機能の提供、リアルタイムメッセージサービス、カスタマイズされたサービスの提供
③ 苦情処理：申請者本人確認、苦情内容の確認、処理結果の通知
④ マーケティングおよび広告への活用：イベントおよびお知らせのご案内（同意した場合に限る）`,
      },
      {
        title: "第2条（収集する個人情報の項目）",
        content: `当社は、サービスの利用のために以下の個人情報を収集します。

■ 必須収集項目
• メールアドレス（会員識別およびログイン用）
• パスワード（暗号化して保存）
• ニックネーム（サービス内での表示名）

■ 任意収集項目
• プロフィール写真
• 自己紹介（bio）
• 国籍 / 現在の居住国
• 使用言語

■ サービス利用過程で自動収集される情報
• アクセスIPアドレス、サービス利用記録、クッキー
• デバイス情報（ブラウザの種類、OS情報）`,
      },
      {
        title: "第3条（個人情報の保有および利用期間）",
        content: `当社は、個人情報の収集・利用目的が達成された後は、当該情報を遅滞なく廃棄します。ただし、以下の情報については、下記の理由により指定した期間保存します。

■ 当社内部方針による保有
• 不正利用防止の記録：1年

■ 関連法令による保有
• 契約または申込の撤回等に関する記録：5年（電子商取引法）
• 消費者の苦情または紛争処理に関する記録：3年（電子商取引法）
• アクセスに関する記録：3ヶ月（通信秘密保護法）`,
      },
      {
        title: "第4条（個人情報の第三者提供）",
        content: `当社は、ユーザーの個人情報を原則として外部に提供しません。ただし、以下の場合は例外とします。

① ユーザーが事前に同意した場合
② 法令の規定に基づく場合、または捜査目的で法令に定められた手続きと方法に従って捜査機関の要求がある場合`,
      },
      {
        title: "第5条（個人情報処理の委託）",
        content: `当社は、円滑な個人情報業務処理のために、以下のとおり個人情報処理業務を委託しています。

■ Supabase Inc.
• 委託業務：データベース運営および認証サービス
• 委託地域：米国（AWSインフラ基盤）
• 保有期間：退会時まで

当社は、委託契約の際に個人情報の目的外処理の禁止、技術的・管理的保護措置、再委託の制限、受託者への管理・監督、損害賠償等の責任に関する事項を契約書等の書類に明記し、受託者が個人情報を安全に処理するかを監督します。`,
      },
      {
        title: "第6条（ユーザーおよび法定代理人の権利と行使方法）",
        content: `ユーザーおよび法定代理人は、いつでも登録されている自身または14歳未満の児童の個人情報を照会・修正することができ、退会を申請することもできます。

個人情報の照会・修正は「プロフィール編集」から、退会（同意の撤回）は「アカウント削除」から、本人確認後に直接行うことができます。

当社は、ユーザーまたは法定代理人の要請により解除または削除された個人情報は「第3条」に定めるとおり処理し、それ以外の目的で閲覧または利用できないよう処理します。`,
      },
      {
        title: "第7条（個人情報の廃棄）",
        content: `当社は、個人情報の保有期間の経過、処理目的の達成等により個人情報が不要になった場合は、遅滞なく当該個人情報を廃棄します。

■ 廃棄手続き
ユーザーが入力した情報は、目的達成後に別のDBに移され、内部方針およびその他関連法令に従い一定期間保存された後、または即時廃棄されます。

■ 廃棄方法
電子的ファイル形式の情報は、記録を再生できない技術的な方法を用いて削除します。`,
      },
      {
        title: "第8条（個人情報の安全性確保措置）",
        content: `当社は、個人情報保護法第29条に従い、安全性確保に必要な以下の技術的・管理的および物理的措置を講じています。

① パスワードの暗号化：ユーザーのパスワードは暗号化されて保存・管理されており、本人のみが知ることができます。
② ハッキング等への技術的対策：ハッキングやコンピューターウイルス等による個人情報の漏洩・毀損を防ぐため、セキュリティプログラムを設置し、定期的に更新・点検を実施しています。
③ 個人情報へのアクセス制限：個人情報を処理するデータベースシステムへのアクセス権限の付与・変更・抹消を通じて、アクセス制御のための必要な措置を講じています。
④ 転送区間の暗号化：HTTPS（TLS）によりデータの転送区間を暗号化しています。`,
      },
      {
        title: "第9条（クッキーの使用）",
        content: `当社は、ユーザーに個別にカスタマイズされたサービスを提供するために、利用情報を保存し随時呼び出す「クッキー（cookie）」を使用します。

■ クッキーの使用目的
ログインセッションの維持、サービス利用環境の記憶（言語、テーマ等）

■ クッキーの設定・運用および拒否
ユーザーはクッキーの設定について選択権を持っています。ウェブブラウザのオプション設定により、すべてのクッキーを許可するか、クッキーが保存されるたびに確認するか、またはすべてのクッキーの保存を拒否することができます。ただし、クッキーの保存を拒否した場合、一部のサービス利用に支障が生じる場合があります。`,
      },
      {
        title: "第10条（個人情報保護責任者）",
        content: `当社は、個人情報処理に関する業務を統括して責任を持ち、個人情報処理に関連するユーザーの苦情処理および被害救済のために、以下のとおり個人情報保護責任者を指定しています。

■ 個人情報保護責任者
• 名前：Borderly 運営チーム
• メール：privacy@borderly.app

ユーザーは、当社のサービスを利用する中で発生したすべての個人情報保護に関するお問い合わせ、苦情処理、被害救済等について個人情報保護責任者にお問い合わせいただけます。`,
      },
      {
        title: "第11条（権利侵害の救済方法）",
        content: `ユーザーは、個人情報侵害による救済を受けるために、個人情報紛争調整委員会、韓国インターネット振興院 個人情報侵害申告センター等に紛争解決や相談を申請することができます。

• 個人情報紛争調整委員会：www.kopico.go.kr / 1833-6972
• 個人情報侵害申告センター：privacy.kisa.or.kr / 118
• 大検察庁サイバー犯罪捜査団：www.spo.go.kr / 02-3480-3573
• 警察庁サイバー安全局：cyberbureau.police.go.kr / 182`,
      },
      {
        title: "第12条（プライバシーポリシーの変更）",
        content: "本プライバシーポリシーは2026年4月6日より適用されます。",
      },
    ],
  },

  en: {
    pageTitle: "Privacy Policy",
    intro:
      "Borderly (\"the Company\") values the privacy of its users and complies with applicable personal data protection laws. This Privacy Policy explains how personal information is collected, used, and protected in connection with the Borderly service (\"the Service\").",
    effectiveDate: "Effective date: April 6, 2026",
    contact: "Contact: privacy@borderly.app",
    sections: [
      {
        title: "Article 1 — Purpose of Collection and Use of Personal Information",
        content: `The Company collects and uses personal information for the following purposes. Collected information will not be used beyond these purposes; if the purpose changes, prior consent will be obtained from users.

① Member registration and management: Confirming intent to register, identity verification, maintaining membership, preventing fraudulent use
② Service provision: Content delivery, community features, real-time messaging, personalized services
③ Complaint handling: Verifying the identity of complainants, reviewing complaints, notifying resolution outcomes
④ Marketing and advertising: Event and notice announcements (only with prior consent)`,
      },
      {
        title: "Article 2 — Categories of Personal Information Collected",
        content: `The Company collects the following personal information to provide the Service.

■ Required information
• Email address (for account identification and login)
• Password (stored encrypted)
• Nickname (display name within the Service)

■ Optional information
• Profile photo
• Bio / self-introduction
• Nationality / current country of residence
• Languages spoken

■ Automatically collected information
• IP address, service usage logs, cookies
• Device information (browser type, OS)`,
      },
      {
        title: "Article 3 — Retention and Use Period of Personal Information",
        content: `Personal information is deleted without delay once the purpose of collection and use has been achieved. However, the following information is retained for the periods specified below.

■ Retained per internal company policy
• Records for preventing fraudulent use: 1 year

■ Retained per applicable law
• Records related to contracts or withdrawal of subscription: 5 years (E-Commerce Act)
• Records related to consumer complaints or dispute resolution: 3 years (E-Commerce Act)
• Access logs: 3 months (Protection of Communications Secrets Act)`,
      },
      {
        title: "Article 4 — Provision of Personal Information to Third Parties",
        content: `The Company does not, in principle, provide users' personal information to third parties. Exceptions apply in the following cases:

① When the user has given prior consent
② When required by law, or when requested by investigative authorities following legally prescribed procedures for investigative purposes`,
      },
      {
        title: "Article 5 — Outsourcing of Personal Information Processing",
        content: `The Company outsources personal information processing as follows to ensure smooth operations.

■ Supabase Inc.
• Outsourced task: Database operation and authentication services
• Location: United States (AWS infrastructure)
• Retention period: Until account deletion

When entering into outsourcing contracts, the Company specifies in writing the prohibition of processing personal information beyond the purpose, technical and managerial safeguards, restrictions on re-outsourcing, supervision of the processor, and liability for damages, and supervises the processor to ensure safe handling.`,
      },
      {
        title: "Article 6 — Rights of Users and Legal Representatives and How to Exercise Them",
        content: `Users and legal representatives may at any time access, correct, or request deletion of registered personal information, including that of children under 14.

To access or correct personal information, use "Edit Profile." To withdraw consent and delete the account, use "Delete Account" after identity verification.

Personal information that has been withdrawn or deleted at the request of a user or legal representative will be handled as specified in Article 3, and will not be accessed or used for any other purpose.`,
      },
      {
        title: "Article 7 — Destruction of Personal Information",
        content: `Personal information that is no longer necessary—due to the expiration of the retention period or achievement of the processing purpose—will be destroyed without delay.

■ Destruction procedure
Information entered by users is transferred to a separate database after its purpose is achieved, stored for a certain period per internal policies and applicable laws, and then destroyed.

■ Destruction method
Personal information stored in electronic form is deleted using technical methods that prevent reproduction of records.`,
      },
      {
        title: "Article 8 — Measures to Ensure the Security of Personal Information",
        content: `Pursuant to Article 29 of the Personal Information Protection Act, the Company implements the following technical, managerial, and physical measures to ensure security.

① Password encryption: Passwords are encrypted and cannot be viewed by anyone other than the user.
② Technical countermeasures against hacking: Security programs are installed and regularly updated to prevent leakage or damage of personal information due to hacking or viruses.
③ Access control: Access rights to databases processing personal information are granted, changed, or revoked as necessary to control access.
④ Transmission encryption: All data transmissions are encrypted via HTTPS (TLS).`,
      },
      {
        title: "Article 9 — Use of Cookies",
        content: `The Company uses cookies to store and retrieve usage information in order to provide personalized services.

■ Purpose of cookies
Maintaining login sessions, remembering service preferences (language, theme, etc.)

■ Cookie settings and opt-out
Users have the right to choose whether to accept cookies. Browser settings can be configured to allow all cookies, prompt before each cookie is saved, or block all cookies. Please note that blocking cookies may affect the availability of some Service features.`,
      },
      {
        title: "Article 10 — Privacy Officer",
        content: `The Company designates a Privacy Officer to oversee all matters related to personal information processing and to handle user complaints and remedies.

■ Privacy Officer
• Name: Borderly Operations Team
• Email: privacy@borderly.app

Users may contact the Privacy Officer with any inquiries, complaints, or requests for remedy related to personal information that arise while using the Service.`,
      },
      {
        title: "Article 11 — Remedies for Rights Infringement",
        content: `Users who have suffered infringement of their personal information rights may apply to the following organizations for dispute resolution or consultation.

• Personal Information Dispute Mediation Committee: www.kopico.go.kr / 1833-6972
• KISA Personal Information Infringement Report Center: privacy.kisa.or.kr / 118
• Supreme Prosecutors' Office Cyber Crime Investigation Unit: www.spo.go.kr / 02-3480-3573
• National Police Agency Cyber Safety Bureau: cyberbureau.police.go.kr / 182`,
      },
      {
        title: "Article 12 — Changes to This Privacy Policy",
        content: "This Privacy Policy is effective as of April 6, 2026.",
      },
    ],
  },
};

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { locale } = useT();

  const c = content[locale];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pb-24 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full transition"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--deep-navy)" }} />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: "var(--primary)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--deep-navy)" }}>
            {c.pageTitle}
          </h1>
        </div>
      </div>

      {/* Intro */}
      <div className="b-card p-5 mb-6">
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {c.intro}
        </p>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          {c.effectiveDate}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {c.sections.map((section, idx) => (
          <div key={idx} className="b-card p-5">
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--deep-navy)" }}>
              {section.title}
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {c.contact}
        </p>
      </div>
    </div>
  );
}
