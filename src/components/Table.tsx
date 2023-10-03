import { css, Global } from "@emotion/react";
import styled from "@emotion/styled";
import { fonts } from "./fonts";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function Table({ data }: any) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <Global
          styles={css`
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            ${fonts}
          `}
        />
        <Wrapper>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Назначение платежа</th>
                  <th>Сумма операции</th>
                </tr>
              </thead>
              <tbody>
                {data?.slice(1)?.map((row: any, index: number) => (
                  <tr key={index}>
                    <td>{row.date}</td>
                    <td>{row.purpose}</td>
                    <td>{row.sum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Wrapper>
      </body>
    </html>
  );
}

const Wrapper = styled.div`
  th {
    font-family: "TT Firs Neue";
    font-style: normal;
    font-weight: 600;
    font-size: 33.0374px;
    line-height: 108%;
    text-align: center;
    color: #ffffff;
    text-align: center;
    background: rgba(0, 174, 239, 0.5);
    padding: 16px 36px;
  }

  td {
    vertical-align: top;
    text-align: left;
    padding: 16px 8px;
    background: rgba(255, 255, 255, 0.8);
    font-family: "TT Firs Neue";
    font-style: normal;
    font-weight: 400;
    font-size: 28px;
    line-height: 36px;
    letter-spacing: -0.03em;
    color: #1b246c;
    text-shadow: 0px 4.42575px 22.1287px rgba(79, 38, 0, 0.25);
  }

  td:first-child {
    font-weight: 500;
    font-size: 30px;
    line-height: 108%;
  }

  td:last-child {
    font-weight: 500;
    font-size: 30px;
    line-height: 108%;
    text-align: center;
    letter-spacing: -0.04em;
    color: #1b246c;
  }

  td:last-child::before {
    content: "₽ ";
  }
  td,
  th {
    overflow: hidden;
  }

  td:not(:first-child),
  th:not(:first-child) {
    border-left: 2px solid white;
  }

  td:last-child,
  th:last-child {
    border-radius: 0 15px 15px 0;
  }

  td:first-child,
  th:first-child {
    border-radius: 15px 0 0 15px;
  }

  table {
    border-collapse: separate;
    border-spacing: 0 16px;
    margin: -16px 0;
  }
`;

export default Table;
