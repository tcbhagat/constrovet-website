# SSM Core Client Test Plan

Use only the private one-click link shared for your scheduled test window. Do not enter real PAN, GSTIN, bank, payroll, vendor, customer, employee, or client records. Downloadable files use obvious placeholder identifiers only, such as `DEMO-PAN-001` and `DEMO-ACCOUNT-001`.

## Button Demo Sequence

1. Open the private SSM Core link.
2. Confirm the API box says `Online`.
3. Click `Clean invoice`, then click `Verify transaction`.
   Expected result: `200_Approve` with an approval token.
4. Click `Pune vendor payment`, then click `Verify transaction`.
   Expected result: `403_Block`, rule `DEMO-GST-PUNE-VENDOR-250K`.
5. Click `Mumbai payroll`, then click `Verify transaction`.
   Expected result: `403_Block`, rule `DEMO-LABOUR-MUMBAI-PAYROLL-100K`.
6. Click `High value invoice`, then click `Verify transaction`.
   Expected result: `403_Block`, rule `DEMO-HIGH-INVOICE-PUNE-900K`.
7. Click `Refresh CA queue`.
8. Click `Approve by CA` on one blocked row.
9. Copy the generated unlock token into the unlock token field.
10. Click `Consume token`.
    Expected result: the token works once. Reusing the same token should fail.

## Downloadable Upload Files

- `tally_vendor_payments.csv`: vendor payment boundary and Pune block test.
- `zoho_payroll_invoice.csv`: Mumbai payroll block and clean invoice test.
- `generic_mixed_upload.csv`: mixed approve, block, and duplicate rows.
- `malformed_upload.csv`: negative validation test file.

These CSV files are synthetic and intended for the production upload workflow. The current SSM Beta page uses the four scenario buttons.
