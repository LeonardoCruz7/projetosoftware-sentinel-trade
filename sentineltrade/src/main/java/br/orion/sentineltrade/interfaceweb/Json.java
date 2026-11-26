package br.orion.sentineltrade.interfaceweb;

import br.orion.sentineltrade.dominio.Dinheiro;
import br.orion.sentineltrade.dominio.Excecoes.ValidacaoException;
import br.orion.sentineltrade.dominio.Ticker;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Serializador e parser JSON leve e sem dependências externas (RFC 8259),
 * compatível com a política do projeto de usar apenas o JDK no núcleo.
 */
public final class Json {
    private Json() {}

    public static String stringify(Object val) {
        StringBuilder sb = new StringBuilder();
        escrever(val, sb);
        return sb.toString();
    }

    private static void escrever(Object val, StringBuilder sb) {
        if (val == null) {
            sb.append("null");
        } else if (val instanceof Boolean || val instanceof Number) {
            sb.append(val);
        } else if (val instanceof Dinheiro d) {
            sb.append(d.valor().toPlainString());
        } else if (val instanceof Ticker || val instanceof Instant || val instanceof UUID || val instanceof Enum<?>) {
            escreverString(val.toString(), sb);
        } else if (val instanceof CharSequence s) {
            escreverString(s.toString(), sb);
        } else if (val instanceof Map<?, ?> m) {
            sb.append('{');
            boolean primeiro = true;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (!primeiro) sb.append(',');
                primeiro = false;
                escreverString(String.valueOf(e.getKey()), sb);
                sb.append(':');
                escrever(e.getValue(), sb);
            }
            sb.append('}');
        } else if (val instanceof Iterable<?> it) {
            sb.append('[');
            boolean primeiro = true;
            for (Object item : it) {
                if (!primeiro) sb.append(',');
                primeiro = false;
                escrever(item, sb);
            }
            sb.append(']');
        } else {
            escreverString(val.toString(), sb);
        }
    }

    private static void escreverString(String s, StringBuilder sb) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        sb.append('"');
    }

    public static Map<String, Object> parseObject(String json) {
        if (json == null || json.isBlank()) return Map.of();
        Parser p = new Parser(json);
        Object v = p.lerValor();
        p.pularEspacos();
        if (p.pos != json.length()) throw new ValidacaoException("JSON inválido (conteúdo extra)");
        if (!(v instanceof Map<?, ?>)) throw new ValidacaoException("JSON deve ser um objeto");
        @SuppressWarnings("unchecked")
        Map<String, Object> mapa = (Map<String, Object>) v;
        return mapa;
    }

    public static String str(Map<String, Object> m, String campo) {
        Object v = m.get(campo);
        if (v == null) return null;
        if (v instanceof String s) return s;
        if (v instanceof Number || v instanceof Boolean) return v.toString();
        throw new ValidacaoException("Campo '" + campo + "' deve ser texto");
    }

    public static boolean bool(Map<String, Object> m, String campo, boolean padrao) {
        Object v = m.get(campo);
        if (v == null) return padrao;
        if (v instanceof Boolean b) return b;
        if (v instanceof String s) return Boolean.parseBoolean(s);
        throw new ValidacaoException("Campo '" + campo + "' deve ser booleano");
    }

    public static int inteiro(Map<String, Object> m, String campo, int padrao) {
        Object v = m.get(campo);
        if (v == null) return padrao;
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s) {
            try { return Integer.parseInt(s.trim()); } catch (NumberFormatException ignored) {}
        }
        throw new ValidacaoException("Campo '" + campo + "' deve ser inteiro");
    }

    private static final class Parser {
        final String s;
        int pos;

        Parser(String s) { this.s = s; }

        void pularEspacos() {
            while (pos < s.length() && Character.isWhitespace(s.charAt(pos))) pos++;
        }

        Object lerValor() {
            pularEspacos();
            if (pos >= s.length()) throw new ValidacaoException("JSON inesperado: fim da entrada");
            char c = s.charAt(pos);
            return switch (c) {
                case '{' -> lerObjeto();
                case '[' -> lerArray();
                case '"' -> lerString();
                case 't', 'f' -> lerBooleano();
                case 'n' -> lerNull();
                default -> {
                    if (c == '-' || (c >= '0' && c <= '9')) yield lerNumero();
                    throw new ValidacaoException("JSON inválido na posição " + pos);
                }
            };
        }

        Map<String, Object> lerObjeto() {
            pos++; // '{'
            Map<String, Object> m = new LinkedHashMap<>();
            pularEspacos();
            if (pos < s.length() && s.charAt(pos) == '}') { pos++; return m; }
            while (true) {
                pularEspacos();
                if (pos >= s.length() || s.charAt(pos) != '"') throw new ValidacaoException("Esperada chave JSON");
                String chave = lerString();
                pularEspacos();
                if (pos >= s.length() || s.charAt(pos) != ':') throw new ValidacaoException("Esperado ':' no JSON");
                pos++;
                m.put(chave, lerValor());
                pularEspacos();
                if (pos >= s.length()) throw new ValidacaoException("Objeto JSON não fechado");
                char sep = s.charAt(pos++);
                if (sep == '}') return m;
                if (sep != ',') throw new ValidacaoException("Esperado ',' ou '}' no JSON");
            }
        }

        List<Object> lerArray() {
            pos++; // '['
            List<Object> l = new ArrayList<>();
            pularEspacos();
            if (pos < s.length() && s.charAt(pos) == ']') { pos++; return l; }
            while (true) {
                l.add(lerValor());
                pularEspacos();
                if (pos >= s.length()) throw new ValidacaoException("Array JSON não fechado");
                char sep = s.charAt(pos++);
                if (sep == ']') return l;
                if (sep != ',') throw new ValidacaoException("Esperado ',' ou ']' no JSON");
            }
        }

        String lerString() {
            pos++; // '"'
            StringBuilder sb = new StringBuilder();
            while (pos < s.length()) {
                char c = s.charAt(pos++);
                if (c == '"') return sb.toString();
                if (c == '\\') {
                    if (pos >= s.length()) throw new ValidacaoException("Escape JSON incompleto");
                    char e = s.charAt(pos++);
                    switch (e) {
                        case '"', '\\', '/' -> sb.append(e);
                        case 'b' -> sb.append('\b');
                        case 'f' -> sb.append('\f');
                        case 'n' -> sb.append('\n');
                        case 'r' -> sb.append('\r');
                        case 't' -> sb.append('\t');
                        case 'u' -> {
                            if (pos + 4 > s.length()) throw new ValidacaoException("Escape unicode inválido");
                            sb.append((char) Integer.parseInt(s.substring(pos, pos + 4), 16));
                            pos += 4;
                        }
                        default -> throw new ValidacaoException("Escape JSON inválido");
                    }
                } else {
                    if (c < 0x20) throw new ValidacaoException("Caractere de controle em string JSON");
                    sb.append(c);
                }
            }
            throw new ValidacaoException("String JSON não terminada");
        }

        Boolean lerBooleano() {
            if (s.startsWith("true", pos)) { pos += 4; return Boolean.TRUE; }
            if (s.startsWith("false", pos)) { pos += 5; return Boolean.FALSE; }
            throw new ValidacaoException("Booleano JSON inválido");
        }

        Object lerNull() {
            if (s.startsWith("null", pos)) { pos += 4; return null; }
            throw new ValidacaoException("Literal JSON inválido");
        }

        BigDecimal lerNumero() {
            int ini = pos;
            if (s.charAt(pos) == '-') pos++;
            while (pos < s.length() && Character.isDigit(s.charAt(pos))) pos++;
            if (pos < s.length() && s.charAt(pos) == '.') {
                pos++;
                if (pos >= s.length() || !Character.isDigit(s.charAt(pos))) throw new ValidacaoException("Número JSON inválido");
                while (pos < s.length() && Character.isDigit(s.charAt(pos))) pos++;
            }
            if (pos < s.length() && (s.charAt(pos) == 'e' || s.charAt(pos) == 'E')) {
                pos++;
                if (pos < s.length() && (s.charAt(pos) == '+' || s.charAt(pos) == '-')) pos++;
                if (pos >= s.length() || !Character.isDigit(s.charAt(pos))) throw new ValidacaoException("Expoente JSON inválido");
                while (pos < s.length() && Character.isDigit(s.charAt(pos))) pos++;
            }
            try { return new BigDecimal(s.substring(ini, pos)); }
            catch (NumberFormatException e) { throw new ValidacaoException("Número JSON inválido"); }
        }
    }
}
