"use client";
import React, { useEffect } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import shared from "../shared";
import { decrypt, post } from "../util";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import * as clipboard from "clipboard-polyfill";

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant='filled' {...props} />;
});

export default function Home() {
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [errorToast, setErrorToast] = React.useState("");
  const [ciphertext, setCiphertext] = React.useState("");
  const [backupPassword, setBackupPassword] = React.useState("");
  const [unlockPassword, setUnlockPassword] = React.useState("");

  const doCommit = () => {
    if (!ciphertext) {
      setErrorToast("ciphertext is empty");
      return;
    }
    if (!backupPassword) {
      setErrorToast("backup password is empty");
      return;
    }
    try {
      const password = decrypt(backupPassword, ciphertext);
      if (password) {
        setUnlockPassword(password);
        setValidPlaintext(true);
      }
    } catch (error) {
      console.log("err:", error as string);
      setErrorToast((error as Error).message);
    }
  };

  const [validPlaintext, setValidPlaintext] = React.useState(false);

  const copyToClipboard = (text: string) => {
    clipboard.writeText(text);
  };

  return (
    <main>
      <Stack marginX='200px' marginTop='50px' spacing={2}>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Typography variant='h6' gutterBottom>
            Step 1: Enter Your Backup Ciphertext
          </Typography>
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <TextField
            id='outlined-basic'
            label='Backup Ciphertext'
            variant='outlined'
            fullWidth
            onChange={(e) => {
              setCiphertext(e.target.value);
            }}
          />
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Typography variant='h6' gutterBottom>
            Step 2: Enter Your Backup Password
          </Typography>
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <TextField
            id='outlined-basic'
            label='Backup Password'
            variant='outlined'
            fullWidth
            onChange={(e) => {
              setBackupPassword(e.target.value);
            }}
          />
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Typography variant='h6' gutterBottom>
            Step 3: Commit
          </Typography>
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Button variant='contained' size='large' fullWidth onClick={doCommit}>
            Commit
          </Button>
        </Stack>
        {validPlaintext && (
          <>
            <Stack direction='row' textAlign='center' justifyContent='left'>
              <Typography variant='h6' gutterBottom>
                Step 5: Results
              </Typography>
            </Stack>
            <Stack
              direction='row'
              textAlign='center'
              justifyContent='left'
              sx={{ marginBottom: 50 }}
            >
              <TextField
                id='outlined-basic'
                label='Password'
                variant='outlined'
                fullWidth
                multiline
                rows={2}
                value={unlockPassword}
                disabled
              />
              <Button
                variant='contained'
                size='large'
                sx={{ marginLeft: "20px" }}
                onClick={() => {
                  copyToClipboard(unlockPassword);
                }}
              >
                Copy
              </Button>
            </Stack>
          </>
        )}
      </Stack>
      <Snackbar
        open={errorToast !== ""}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setErrorToast("")}
      >
        <Alert
          onClose={() => setErrorToast("")}
          severity='error'
          sx={{ width: "100%" }}
        >
          {errorToast}
        </Alert>
      </Snackbar>
      <Snackbar
        open={toast !== ""}
        autoHideDuration={4500}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setToast("")}
      >
        <Alert
          onClose={() => setToast("")}
          severity='success'
          sx={{ width: "100%" }}
        >
          {toast}
        </Alert>
      </Snackbar>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color='inherit' />
      </Backdrop>
    </main>
  );
}
