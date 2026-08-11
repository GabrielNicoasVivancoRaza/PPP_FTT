"""
Elimina columnas de un archivo CSV, manteniendo el resultado en formato CSV.

Uso:
    python eliminar_columnas.py
"""

import pandas as pd

# Ruta del archivo CSV a modificar
RUTA_CSV = r"C:\Users\Gabo\OneDrive\Escritorio\ProyectoFTT\Canje FTT\FTC AL PARQUE 04-08.csv"

# Nombres exactos de las columnas a eliminar
COLUMNAS_A_ELIMINAR = [
    "Guest #",
    "Phone Number",
    "Gift Card Code",
    "Tracking Link",
    "Facebook Share",
    "Twitter Share",
    "Transaction Time (Local)",
    "Transaction Date (UTC)",
    "Payment Plan",
    "Gateway Trans. ID",
    "Payment Method",
    "Card Type",
    "Trace ID",
    "Box Office",
    "Processed By",
    "Bundle Purchase",
    "Delivery Method",
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "Zip",
    "Country",
    "Ticket Price",
    "Gross Sales",
    "Tax Paid",
    "Guest Payment Amount",
    "SquadUP Fee",
    "Processing Fee",
    "Insurance Premium",
    "Added Fee",
    "Shipping Fee",
    "Discount Amount",
    "Gift Card Amount",
    "Comp Amount",
    "Exchange Amount",
    "Refund Amount",
    "Net Sales",
    "Payout Amount",
    "Notes",
    "Conf. Email Delivered At",
    "CineSend Voucher URL",
    "Checked-In",
    "Checked-In Time",
    "Es mandatorio incluir los datos de las personas que asistirán al evento para poder hacer uso de la cobertura.",
    "Al comprar este boleto, confirmo que estoy de acuerdo con los términos y condiciones de compra expuestos en la pagina www.feelthetickets.com ",
    "Una vez realizada la compra no se podrá aplicar descuento alguno. Para acceder al descuento de tercera edad o discapacidad deben acercarse al punto de venta a realizar la compra, deberá llevar copia de cédula, este descuento será personal e intrasferible.",
    "Fecha de Nacimiento:",
    "Mes de Nacimiento:",
    "Año de Nacimiento:",
    "Pago con Datafast?",
    "Event Name",
]

# Ruta de salida (podés usar la misma RUTA_CSV para sobrescribir)
RUTA_SALIDA = RUTA_CSV


def eliminar_columnas(ruta_csv, columnas, ruta_salida):
    df = pd.read_csv(ruta_csv, encoding="utf-8-sig")

    columnas_existentes = [c for c in columnas if c in df.columns]
    columnas_no_encontradas = [c for c in columnas if c not in df.columns]

    if columnas_no_encontradas:
        print(f"Aviso: no se encontraron estas columnas: {columnas_no_encontradas}")

    df = df.drop(columns=columnas_existentes)
    df.to_csv(ruta_salida, index=False, encoding="utf-8-sig")
    print(f"Listo. Se eliminaron {len(columnas_existentes)} columnas.")
    print(f"Archivo guardado en: {ruta_salida}")


if __name__ == "__main__":
    eliminar_columnas(RUTA_CSV, COLUMNAS_A_ELIMINAR, RUTA_SALIDA)
