"use client";
import React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import { post } from "../util";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

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
  const [email, setEmail] = React.useState("");
  const [tcEmail, setTcEmail] = React.useState("");

  const doCommit = () => {
    if (!email) {
      setErrorToast("account email is empty");
      return;
    }
    if (!tcEmail) {
      setErrorToast("trusted contact email is empty");
      return;
    }
    post(
      false,
      "",
      "/pswds/getBackupCiphertext/v1",
      setLoading,
      true,
      {
        email,
        contactEmail: tcEmail,
      },
      undefined,
      setToast,
      setErrorToast
    );
  };

  return (
    <main>
      <Stack marginX='200px' marginTop='50px' spacing={2}>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Typography variant='h6' gutterBottom>
            Step 1: Enter Account Email
          </Typography>
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <TextField
            id='outlined-basic'
            label='Account Email'
            variant='outlined'
            fullWidth
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Typography variant='h6' gutterBottom>
            Step 2: Enter Trusted Contact Email
          </Typography>
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <TextField
            id='outlined-basic'
            label='Trusted Contact Email'
            variant='outlined'
            fullWidth
            onChange={(e) => {
              setTcEmail(e.target.value);
            }}
          />
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Typography variant='h6' gutterBottom>
            Step 3: Commit
          </Typography>
        </Stack>
        <Stack direction='row' textAlign='center' justifyContent='left'>
          <Button
            variant='contained'
            size='large'
            fullWidth
            onClick={() => {
              doCommit();
            }}
          >
            Commit
          </Button>
        </Stack>
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
