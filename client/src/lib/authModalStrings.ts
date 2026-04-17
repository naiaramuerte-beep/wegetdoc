/**
 * Shared i18n strings used by AuthModal (home) and PaywallModal (post-download).
 * These are intentionally NOT in the central i18n.ts to keep the diff light:
 * the TranslationKeys interface is strict and adding ~20 keys to all 10 langs
 * would be a large churn. Missing langs fall back to English.
 */
export type AuthModalStrings = {
  // Auth flow
  signupEyebrow: string; loginEyebrow: string; forgotEyebrow: string;
  signupSubtitle: string;
  welcomeTitle: string; welcomeSubtitle: string;
  resetTitle: string; resetSubtitle: string;
  forgotQ: string; clickHere: string; sendReset: string; backToLogin: string;

  // GDPR
  gdprPrefix: string; gdprAnd: string; gdprSuffix: string;
  gdprRequired: string; gdprTooltip: string;
  termsLinkLabel: string; privacyLinkLabel: string;

  // Switch / feedback
  createAccountSwitch: string;
  registerSuccess: string; registerError: string;
  loginSuccess: string; loginError: string;
  forgotSent: string; forgotError: string;

  // Paywall-specific
  paywallTitle: string;       // e.g. "Crear cuenta"
  paywallSubtitle: string;    // e.g. "para descargar tu documento"
};

export const AUTH_STRINGS: Record<string, AuthModalStrings> = {
  es: {
    signupEyebrow: "Registro", loginEyebrow: "Acceso", forgotEyebrow: "Recuperar contraseña",
    signupSubtitle: "Edita, firma y guarda tus PDFs en segundos.",
    welcomeTitle: "¡Bienvenido de nuevo!", welcomeSubtitle: "Inicia sesión con tus redes o completa tus datos.",
    resetTitle: "Restablecer contraseña", resetSubtitle: "Introduce tu email y te enviaremos un enlace para restablecerla.",
    forgotQ: "¿Olvidaste tu contraseña?", clickHere: "Haz clic aquí", sendReset: "Enviar enlace", backToLogin: "Volver al acceso",
    gdprPrefix: "He leído y acepto los", gdprAnd: " y la ", gdprSuffix: ". Autorizo el tratamiento de mis datos personales conforme al Reglamento General de Protección de Datos (RGPD).",
    gdprRequired: "Debes aceptar los Términos y la Política de Privacidad",
    gdprTooltip: "Acepta los Términos y la Política de Privacidad para continuar",
    createAccountSwitch: "Crea una cuenta",
    termsLinkLabel: "Términos y Condiciones", privacyLinkLabel: "Política de Privacidad",
    registerSuccess: "¡Cuenta creada correctamente!", registerError: "Error al registrarse",
    loginSuccess: "¡Bienvenido de nuevo!", loginError: "Email o contraseña incorrectos",
    forgotSent: "Si el email existe, recibirás un enlace", forgotError: "Error al enviar el email",
    paywallTitle: "Crea tu cuenta", paywallSubtitle: "para descargar tu documento",
  },
  en: {
    signupEyebrow: "Sign up", loginEyebrow: "Login", forgotEyebrow: "Forgot password",
    signupSubtitle: "Edit, sign and save your PDFs in seconds.",
    welcomeTitle: "Welcome Back!", welcomeSubtitle: "Sign in with your social networks or complete your details.",
    resetTitle: "Reset your password", resetSubtitle: "Enter your email and we'll send you a reset link.",
    forgotQ: "Did you forget your password?", clickHere: "Click here", sendReset: "Send reset link", backToLogin: "Back to Login",
    gdprPrefix: "I have read and accept the", gdprAnd: " and the ", gdprSuffix: ". I authorize the processing of my personal data under the General Data Protection Regulation (GDPR).",
    gdprRequired: "You must accept the Terms and Privacy Policy",
    gdprTooltip: "Accept the Terms and Privacy Policy to continue",
    createAccountSwitch: "Create an account",
    termsLinkLabel: "Terms & Conditions", privacyLinkLabel: "Privacy Policy",
    registerSuccess: "Account created successfully!", registerError: "Error creating account",
    loginSuccess: "Welcome back!", loginError: "Invalid email or password",
    forgotSent: "If the email exists, you'll get a reset link", forgotError: "Error sending email",
    paywallTitle: "Create your account", paywallSubtitle: "to download your document",
  },
  fr: {
    signupEyebrow: "Inscription", loginEyebrow: "Connexion", forgotEyebrow: "Mot de passe oublié",
    signupSubtitle: "Éditez, signez et enregistrez vos PDF en quelques secondes.",
    welcomeTitle: "Heureux de vous revoir !", welcomeSubtitle: "Connectez-vous via vos réseaux ou avec vos identifiants.",
    resetTitle: "Réinitialiser le mot de passe", resetSubtitle: "Entrez votre email et nous vous enverrons un lien.",
    forgotQ: "Mot de passe oublié ?", clickHere: "Cliquez ici", sendReset: "Envoyer le lien", backToLogin: "Retour à la connexion",
    gdprPrefix: "J'ai lu et j'accepte les", gdprAnd: " et la ", gdprSuffix: ". J'autorise le traitement de mes données personnelles selon le Règlement Général sur la Protection des Données (RGPD).",
    gdprRequired: "Vous devez accepter les Conditions et la Politique de confidentialité",
    gdprTooltip: "Acceptez les Conditions et la Politique de confidentialité pour continuer",
    createAccountSwitch: "Créer un compte",
    termsLinkLabel: "Conditions d'utilisation", privacyLinkLabel: "Politique de confidentialité",
    registerSuccess: "Compte créé avec succès !", registerError: "Erreur lors de la création du compte",
    loginSuccess: "Heureux de vous revoir !", loginError: "Email ou mot de passe invalide",
    forgotSent: "Si l'email existe, vous recevrez un lien", forgotError: "Erreur lors de l'envoi",
    paywallTitle: "Créer votre compte", paywallSubtitle: "pour télécharger votre document",
  },
  de: {
    signupEyebrow: "Registrieren", loginEyebrow: "Anmelden", forgotEyebrow: "Passwort vergessen",
    signupSubtitle: "PDFs in Sekunden bearbeiten, signieren und speichern.",
    welcomeTitle: "Willkommen zurück!", welcomeSubtitle: "Melden Sie sich mit Ihren Konten an oder geben Sie Ihre Daten ein.",
    resetTitle: "Passwort zurücksetzen", resetSubtitle: "Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Link.",
    forgotQ: "Passwort vergessen?", clickHere: "Hier klicken", sendReset: "Link senden", backToLogin: "Zurück zur Anmeldung",
    gdprPrefix: "Ich habe die", gdprAnd: " und die ", gdprSuffix: " gelesen und akzeptiere sie. Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß DSGVO zu.",
    gdprRequired: "Bitte akzeptieren Sie die Nutzungsbedingungen und die Datenschutzrichtlinie",
    gdprTooltip: "Akzeptieren Sie die Bedingungen, um fortzufahren",
    createAccountSwitch: "Konto erstellen",
    termsLinkLabel: "Nutzungsbedingungen", privacyLinkLabel: "Datenschutzrichtlinie",
    registerSuccess: "Konto erfolgreich erstellt!", registerError: "Fehler bei der Registrierung",
    loginSuccess: "Willkommen zurück!", loginError: "Ungültige E-Mail oder Passwort",
    forgotSent: "Falls die E-Mail existiert, erhalten Sie einen Link", forgotError: "Fehler beim Senden",
    paywallTitle: "Konto erstellen", paywallSubtitle: "um Ihr Dokument herunterzuladen",
  },
  pt: {
    signupEyebrow: "Criar conta", loginEyebrow: "Entrar", forgotEyebrow: "Esqueci a senha",
    signupSubtitle: "Edite, assine e salve seus PDFs em segundos.",
    welcomeTitle: "Bem-vindo de volta!", welcomeSubtitle: "Entre com suas redes sociais ou complete seus dados.",
    resetTitle: "Redefinir senha", resetSubtitle: "Digite seu email e enviaremos um link de redefinição.",
    forgotQ: "Esqueceu a senha?", clickHere: "Clique aqui", sendReset: "Enviar link", backToLogin: "Voltar ao login",
    gdprPrefix: "Li e aceito os", gdprAnd: " e a ", gdprSuffix: ". Autorizo o tratamento dos meus dados pessoais conforme o Regulamento Geral de Proteção de Dados (RGPD).",
    gdprRequired: "Você precisa aceitar os Termos e a Política de Privacidade",
    gdprTooltip: "Aceite os Termos e a Política de Privacidade para continuar",
    createAccountSwitch: "Criar uma conta",
    termsLinkLabel: "Termos e Condições", privacyLinkLabel: "Política de Privacidade",
    registerSuccess: "Conta criada com sucesso!", registerError: "Erro ao criar conta",
    loginSuccess: "Bem-vindo de volta!", loginError: "Email ou senha inválidos",
    forgotSent: "Se o email existir, você receberá um link", forgotError: "Erro ao enviar email",
    paywallTitle: "Crie sua conta", paywallSubtitle: "para baixar seu documento",
  },
  it: {
    signupEyebrow: "Registrati", loginEyebrow: "Accedi", forgotEyebrow: "Password dimenticata",
    signupSubtitle: "Modifica, firma e salva i tuoi PDF in pochi secondi.",
    welcomeTitle: "Bentornato!", welcomeSubtitle: "Accedi con i tuoi social o completa i dati.",
    resetTitle: "Reimposta password", resetSubtitle: "Inserisci la tua email e ti invieremo un link.",
    forgotQ: "Password dimenticata?", clickHere: "Clicca qui", sendReset: "Invia link", backToLogin: "Torna al login",
    gdprPrefix: "Ho letto e accetto i", gdprAnd: " e la ", gdprSuffix: ". Autorizzo il trattamento dei miei dati personali ai sensi del Regolamento Generale sulla Protezione dei Dati (GDPR).",
    gdprRequired: "Devi accettare i Termini e la Privacy Policy",
    gdprTooltip: "Accetta Termini e Privacy per continuare",
    createAccountSwitch: "Crea un account",
    termsLinkLabel: "Termini e Condizioni", privacyLinkLabel: "Informativa sulla Privacy",
    registerSuccess: "Account creato con successo!", registerError: "Errore durante la registrazione",
    loginSuccess: "Bentornato!", loginError: "Email o password non valide",
    forgotSent: "Se l'email esiste, riceverai un link", forgotError: "Errore durante l'invio",
    paywallTitle: "Crea il tuo account", paywallSubtitle: "per scaricare il tuo documento",
  },
  nl: {
    signupEyebrow: "Registreren", loginEyebrow: "Inloggen", forgotEyebrow: "Wachtwoord vergeten",
    signupSubtitle: "Bewerk, onderteken en bewaar je PDF's in seconden.",
    welcomeTitle: "Welkom terug!", welcomeSubtitle: "Log in met je sociale netwerken of vul je gegevens in.",
    resetTitle: "Wachtwoord herstellen", resetSubtitle: "Voer je e-mail in en we sturen een link.",
    forgotQ: "Wachtwoord vergeten?", clickHere: "Klik hier", sendReset: "Link versturen", backToLogin: "Terug naar login",
    gdprPrefix: "Ik heb de", gdprAnd: " en het ", gdprSuffix: " gelezen en accepteer deze. Ik geef toestemming voor de verwerking van mijn persoonsgegevens onder de AVG.",
    gdprRequired: "Je moet de Voorwaarden en het Privacybeleid accepteren",
    gdprTooltip: "Accepteer de Voorwaarden en het Privacybeleid om door te gaan",
    createAccountSwitch: "Account aanmaken",
    termsLinkLabel: "Algemene Voorwaarden", privacyLinkLabel: "Privacybeleid",
    registerSuccess: "Account succesvol aangemaakt!", registerError: "Fout bij registratie",
    loginSuccess: "Welkom terug!", loginError: "Ongeldige e-mail of wachtwoord",
    forgotSent: "Als de e-mail bestaat, ontvang je een link", forgotError: "Fout bij verzenden",
    paywallTitle: "Maak een account aan", paywallSubtitle: "om je document te downloaden",
  },
  pl: {
    signupEyebrow: "Rejestracja", loginEyebrow: "Logowanie", forgotEyebrow: "Zapomniane hasło",
    signupSubtitle: "Edytuj, podpisuj i zapisuj PDF w kilka sekund.",
    welcomeTitle: "Witaj ponownie!", welcomeSubtitle: "Zaloguj się przez sieci społecznościowe lub podaj dane.",
    resetTitle: "Zresetuj hasło", resetSubtitle: "Podaj e-mail, a wyślemy link.",
    forgotQ: "Zapomniałeś hasła?", clickHere: "Kliknij tutaj", sendReset: "Wyślij link", backToLogin: "Powrót do logowania",
    gdprPrefix: "Przeczytałem i akceptuję", gdprAnd: " oraz ", gdprSuffix: ". Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z RODO.",
    gdprRequired: "Musisz zaakceptować Regulamin i Politykę Prywatności",
    gdprTooltip: "Zaakceptuj Regulamin i Politykę Prywatności, aby kontynuować",
    createAccountSwitch: "Utwórz konto",
    termsLinkLabel: "Regulamin", privacyLinkLabel: "Polityka Prywatności",
    registerSuccess: "Konto utworzone!", registerError: "Błąd rejestracji",
    loginSuccess: "Witaj ponownie!", loginError: "Nieprawidłowy e-mail lub hasło",
    forgotSent: "Jeśli e-mail istnieje, otrzymasz link", forgotError: "Błąd wysyłania",
    paywallTitle: "Utwórz konto", paywallSubtitle: "aby pobrać dokument",
  },
  ru: {
    signupEyebrow: "Регистрация", loginEyebrow: "Вход", forgotEyebrow: "Забыли пароль",
    signupSubtitle: "Редактируйте, подписывайте и сохраняйте PDF за секунды.",
    welcomeTitle: "С возвращением!", welcomeSubtitle: "Войдите через соцсети или заполните данные.",
    resetTitle: "Сброс пароля", resetSubtitle: "Введите e-mail и мы пришлём ссылку.",
    forgotQ: "Забыли пароль?", clickHere: "Нажмите здесь", sendReset: "Отправить ссылку", backToLogin: "Вернуться ко входу",
    gdprPrefix: "Я прочитал и принимаю", gdprAnd: " и ", gdprSuffix: ". Даю согласие на обработку персональных данных в соответствии с GDPR.",
    gdprRequired: "Необходимо принять Условия и Политику конфиденциальности",
    gdprTooltip: "Примите Условия и Политику конфиденциальности для продолжения",
    createAccountSwitch: "Создать аккаунт",
    termsLinkLabel: "Условия использования", privacyLinkLabel: "Политика конфиденциальности",
    registerSuccess: "Аккаунт создан!", registerError: "Ошибка регистрации",
    loginSuccess: "С возвращением!", loginError: "Неверный e-mail или пароль",
    forgotSent: "Если e-mail существует, вы получите ссылку", forgotError: "Ошибка отправки",
    paywallTitle: "Создайте аккаунт", paywallSubtitle: "чтобы скачать документ",
  },
  zh: {
    signupEyebrow: "注册", loginEyebrow: "登录", forgotEyebrow: "忘记密码",
    signupSubtitle: "几秒钟内编辑、签名并保存您的 PDF。",
    welcomeTitle: "欢迎回来!", welcomeSubtitle: "使用社交网络登录或填写您的信息。",
    resetTitle: "重置密码", resetSubtitle: "输入您的邮箱,我们会发送重置链接。",
    forgotQ: "忘记密码了吗?", clickHere: "点击这里", sendReset: "发送链接", backToLogin: "返回登录",
    gdprPrefix: "我已阅读并接受", gdprAnd: " 和 ", gdprSuffix: "。我授权根据《通用数据保护条例》(GDPR) 处理我的个人数据。",
    gdprRequired: "您必须接受条款和隐私政策",
    gdprTooltip: "接受条款和隐私政策以继续",
    createAccountSwitch: "创建账户",
    termsLinkLabel: "服务条款", privacyLinkLabel: "隐私政策",
    registerSuccess: "账户创建成功!", registerError: "注册失败",
    loginSuccess: "欢迎回来!", loginError: "邮箱或密码错误",
    forgotSent: "如果邮箱存在,您将收到链接", forgotError: "发送失败",
    paywallTitle: "创建账户", paywallSubtitle: "下载您的文档",
  },
};

export function getAuthStrings(lang: string): AuthModalStrings {
  return AUTH_STRINGS[lang] ?? AUTH_STRINGS.en;
}
