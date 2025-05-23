"use client";
import * as React from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import { TransitionProps } from "@mui/material/transitions";
import Slide from "@mui/material/Slide";
import {
  post,
  aes256GCM_secp256k1Decrypt,
  decryptByXchacha20poly1305,
} from "@/app/util";
import * as secp from "@noble/secp256k1";
import QRCode from "qrcode";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import * as clipboard from "clipboard-polyfill";
import Typography from "@mui/material/Typography";
import QrScanner from "qr-scanner";
import { AnimatedQRCodeDecoder } from "@doomjs/animated-qrcode";
import { keccak_256 } from "@noble/hashes/sha3";

interface Password {
  id: string;
  createdAt: number;
  updatedAt: number;
  userID: number;
  title: string;
  website: string | null;
  username: string;
  password: string;
  notes: string | null;
  others: string | null;
  usedAt: number | null;
  usedCount: number | null;
  iconBgColor: number | null;
}

interface Record {
  id: string;
  createdAt: number;
  updatedAt: number;
  userID: number;
  recordType: string;
  title: string;
  iconBgColor: number | null;
  // mixed fields
  phone: string | null;
  type: string | null;
  number: string | null;
  address: string | null;
  fullName: string | null;
  birthDate: string | null;
  gender: string | null;
  pin: string | null;
  expiryDate: string | null;
  others: string | null;
  // identity fields
  firstName: string | null;
  lastName: string | null;
  job: string | null;
  socialSecurityNumber: string | null;
  idNumber: string | null;
  // credit card fields
  cardholderName: string | null;
  verificationNumber: string | null;
  validFrom: string | null;
  issuingBank: string | null;
  // bank account fields
  bankName: string | null;
  nameOnAccount: string | null;
  routingNumber: string | null;
  branch: string | null;
  accountNumber: string | null;
  swift: string | null;
  // driver license fields
  height: string | null;
  licenseClass: string | null;
  state: string | null;
  country: string | null;
  // passport fields
  issuingCountry: string | null;
  nationality: string | null;
  issuingAuthority: string | null;
  birthPlace: string | null;
  issuedOn: string | null;
}

interface OtherField {
  type: "text" | "url" | "password" | "one-time password" | "date" | "pin";
  key: string;
  value: string;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction='up' ref={ref} {...props} />;
});

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant='filled' {...props} />;
});

export default function Page() {
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [errorToast, setErrorToast] = React.useState("");
  const [uuid, setUuid] = React.useState("");
  const [privKey, setPrivKey] = React.useState<null | Uint8Array>(null);
  const [record, setRecord] = React.useState<any>(null);
  const [others, setOthers] = React.useState<null | OtherField[]>(null);
  const [isPassword, setIsPassword] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [pinCode, setPinCode] = React.useState("");
  const [encryptedData, setEncryptedData] = React.useState("");
  const scanQR = () => {
    let decoder = new AnimatedQRCodeDecoder();
    const videoElem: HTMLElement | null = document.getElementById("video");
    if (videoElem) {
      const qrScanner = new QrScanner(
        videoElem as HTMLVideoElement,
        (result) => {
          try {
            decoder.receivePart(result.data);
            let curProgress = decoder.getProgress();
            if (progress > curProgress) {
              curProgress = progress;
            }
            setProgress(curProgress);
            if (decoder.finished) {
              const objString = decoder.result!.toString();
              if (objString) {
                let obj = JSON.parse(objString);
                if (obj.pin) {
                  setEncryptedData(obj.data);
                } else {
                  const data = JSON.parse(obj.data);
                  setRecord(data);
                  if (!data.recordType) {
                    setIsPassword(true);
                  } else {
                    setIsPassword(false);
                  }
                  if (data.others) {
                    let others = JSON.parse(data.others);
                    setOthers(others);
                  }
                }
              }
              qrScanner.destroy();
              setProgress(0);
            }
          } catch (error) {
            decoder = new AnimatedQRCodeDecoder(); // the lib has bug, so do catch
          }
        },
        {
          /* your options or returnDetailedScanResult: true if you're not specifying any other options */
        }
      );
      qrScanner.start();
    }
  };
  const copyToClipboard = (text: string) => {
    clipboard.writeText(text);
  };
  const validatePinCode = () => {
    try {
      const dataString = decryptByXchacha20poly1305(
        keccak_256(pinCode),
        encryptedData
      );
      const data = JSON.parse(dataString);
      setRecord(data);
      if (!data.recordType) {
        setIsPassword(true);
      } else {
        setIsPassword(false);
      }
      if (data.others) {
        let others = JSON.parse(data.others);
        setOthers(others);
      }
      setEncryptedData("");
      setPinCode("");
    } catch (error) {
      setErrorToast("invalid pin code, please input again.");
    }
  };

  return (
    <Stack
      spacing={5}
      direction='column'
      alignItems='center'
      sx={{
        padding: "1rem",
      }}
    >
      <Button
        disabled={encryptedData !== ""}
        size='large'
        variant='contained'
        onClick={() => {
          setTimeout(() => {
            setRecord(null);
            setOthers(null);
          });
          scanQR();
        }}
      >
        Generate
      </Button>
      {encryptedData && (
        <Stack spacing={2} alignItems='center' direction='row'>
          <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
            <InputLabel htmlFor='outlined-adornment-title'>Pin Code</InputLabel>
            <OutlinedInput
              id='outlined-adornment-title'
              value={pinCode}
              label={"Pin Code"}
              placeholder='Please input pin code'
              onChange={(e) => {
                setPinCode(e.target.value);
              }}
            />
          </FormControl>
          <Button size='large' variant='contained' onClick={validatePinCode}>
            Ok
          </Button>
        </Stack>
      )}
      {record && (
        <>
          {isPassword && (
            <>
              <Stack spacing={2} alignItems='center' direction='row'>
                <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                  <InputLabel htmlFor='outlined-adornment-title'>
                    Title
                  </InputLabel>
                  <OutlinedInput
                    id='outlined-adornment-title'
                    value={record.title}
                    label={"Title"}
                  />
                </FormControl>
                <Button
                  sx={{ visibility: "hidden" }}
                  size='large'
                  variant='contained'
                  onClick={() => {
                    copyToClipboard(record.title);
                  }}
                >
                  Copy
                </Button>
              </Stack>
              {record.website && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-url'>
                      Website
                    </InputLabel>
                    <OutlinedInput
                      value={record.website}
                      id='outlined-adornment-url'
                      label={"Website"}
                    />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.website);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.username && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Username
                    </InputLabel>
                    <OutlinedInput
                      value={record.username}
                      id='outlined-adornment-username'
                      label={"Username"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.username);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.password && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Password
                    </InputLabel>
                    <OutlinedInput
                      value={record.password}
                      id='outlined-adornment-username'
                      label={"Password"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.password);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.notes && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Notes
                    </InputLabel>
                    <OutlinedInput
                      value={record.notes}
                      id='outlined-adornment-username'
                      label={"Notes"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.notes);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
            </>
          )}
          {!isPassword && (
            <>
              <Stack spacing={2} alignItems='center' direction='row'>
                <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                  <InputLabel htmlFor='outlined-adornment-title'>
                    Title
                  </InputLabel>
                  <OutlinedInput
                    id='outlined-adornment-title'
                    value={record.title}
                    label={"Title"}
                  />
                </FormControl>
                <Button
                  sx={{ visibility: "hidden" }}
                  size='large'
                  variant='contained'
                  onClick={() => {
                    copyToClipboard(record.title);
                  }}
                >
                  Copy
                </Button>
              </Stack>
              {record.phone && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-url'>
                      Phone
                    </InputLabel>
                    <OutlinedInput value={record.phone} label={"Phone"} />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.phone);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.type && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Type
                    </InputLabel>
                    <OutlinedInput value={record.type} label={"Type"} />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.type);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.number && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Number
                    </InputLabel>
                    <OutlinedInput
                      value={record.number}
                      id='outlined-adornment-username'
                      label={"Number"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.number);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.address && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Address
                    </InputLabel>
                    <OutlinedInput
                      value={record.address}
                      id='outlined-adornment-username'
                      label={"Address"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.address);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.fullName && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-title'>
                      Full Name
                    </InputLabel>
                    <OutlinedInput
                      id='outlined-adornment-title'
                      value={record.fullName}
                      label={"Full Name"}
                    />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.fullName);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.birthDate && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-url'>
                      Birth Date
                    </InputLabel>
                    <OutlinedInput
                      value={record.birthDate}
                      id='outlined-adornment-url'
                      label={"Birth Date"}
                    />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.birthDate);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.gender && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Gender
                    </InputLabel>
                    <OutlinedInput
                      value={record.gender}
                      id='outlined-adornment-username'
                      label={"Gender"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.gender);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.pin && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      PIN
                    </InputLabel>
                    <OutlinedInput
                      value={record.pin}
                      id='outlined-adornment-username'
                      label={"PIN"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.pin);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.expiryDate && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Expiry Date
                    </InputLabel>
                    <OutlinedInput
                      value={record.expiryDate}
                      id='outlined-adornment-username'
                      label={"Expiry Date"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.expiryDate);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.firstName && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-title'>
                      First Name
                    </InputLabel>
                    <OutlinedInput
                      id='outlined-adornment-title'
                      value={record.firstName}
                      label={"First Name"}
                    />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.firstName);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.lastName && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-url'>
                      Last Name
                    </InputLabel>
                    <OutlinedInput
                      value={record.lastName}
                      id='outlined-adornment-url'
                      label={"Last Name"}
                    />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.lastName);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.job && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Job
                    </InputLabel>
                    <OutlinedInput
                      value={record.job}
                      id='outlined-adornment-username'
                      label={"Job"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.job);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.socialSecurityNumber && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Social Security Number
                    </InputLabel>
                    <OutlinedInput
                      value={record.socialSecurityNumber}
                      id='outlined-adornment-username'
                      label={"Social Security Number"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.socialSecurityNumber);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.idNumber && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      ID Number
                    </InputLabel>
                    <OutlinedInput
                      value={record.idNumber}
                      id='outlined-adornment-username'
                      label={"ID Number"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.idNumber);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.cardholderName && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-title'>
                      Cardholder Name
                    </InputLabel>
                    <OutlinedInput
                      id='outlined-adornment-title'
                      value={record.cardholderName}
                      label={"Cardholder Name"}
                    />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.cardholderName);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.verificationNumber && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-url'>
                      Verification Number
                    </InputLabel>
                    <OutlinedInput
                      value={record.verificationNumber}
                      id='outlined-adornment-url'
                      label={"Verification Number"}
                    />
                  </FormControl>
                  <Button
                    sx={{ visibility: "hidden" }}
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.verificationNumber);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.validFrom && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Valid From
                    </InputLabel>
                    <OutlinedInput
                      value={record.validFrom}
                      id='outlined-adornment-username'
                      label={"Valid From"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.validFrom);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.issuingBank && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Issuing Bank
                    </InputLabel>
                    <OutlinedInput
                      value={record.issuingBank}
                      id='outlined-adornment-username'
                      label={"Issuing Bank"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.issuingBank);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.bankName && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Bank Name
                    </InputLabel>
                    <OutlinedInput
                      value={record.bankName}
                      id='outlined-adornment-username'
                      label={"Bank Name"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.bankName);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.nameOnAccount && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Name On Account
                    </InputLabel>
                    <OutlinedInput
                      value={record.nameOnAccount}
                      id='outlined-adornment-username'
                      label={"Name On Account"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.nameOnAccount);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.routingNumber && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Routing Number
                    </InputLabel>
                    <OutlinedInput
                      value={record.routingNumber}
                      id='outlined-adornment-username'
                      label={"Routing Number"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.routingNumber);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.branch && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Branch
                    </InputLabel>
                    <OutlinedInput
                      value={record.branch}
                      id='outlined-adornment-username'
                      label={"Branch"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.branch);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.accountNumber && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Account Number
                    </InputLabel>
                    <OutlinedInput
                      value={record.accountNumber}
                      id='outlined-adornment-username'
                      label={"Account Number"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.accountNumber);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.swift && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      SWIFT
                    </InputLabel>
                    <OutlinedInput
                      value={record.swift}
                      id='outlined-adornment-username'
                      label={"SWIFT"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.swift);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.height && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Height
                    </InputLabel>
                    <OutlinedInput
                      value={record.height}
                      id='outlined-adornment-username'
                      label={"Height"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.height);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}

              {record.licenseClass && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      License Class
                    </InputLabel>
                    <OutlinedInput
                      value={record.licenseClass}
                      id='outlined-adornment-username'
                      label={"License Class"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.licenseClass);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.state && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      State
                    </InputLabel>
                    <OutlinedInput
                      value={record.state}
                      id='outlined-adornment-username'
                      label={"State"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.state);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.country && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Country
                    </InputLabel>
                    <OutlinedInput
                      value={record.country}
                      id='outlined-adornment-username'
                      label={"Country"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.country);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.issuingCountry && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Issuing Country
                    </InputLabel>
                    <OutlinedInput
                      value={record.issuingCountry}
                      id='outlined-adornment-username'
                      label={"Issuing Country"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.issuingCountry);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.nationality && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Nationality
                    </InputLabel>
                    <OutlinedInput
                      value={record.nationality}
                      id='outlined-adornment-username'
                      label={"Nationality"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.nationality);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.issuingAuthority && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Issuing Authority
                    </InputLabel>
                    <OutlinedInput
                      value={record.issuingAuthority}
                      id='outlined-adornment-username'
                      label={"Issuing Authority"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.issuingAuthority);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.birthPlace && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Birth Place
                    </InputLabel>
                    <OutlinedInput
                      value={record.birthPlace}
                      id='outlined-adornment-username'
                      label={"Birth Place"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.birthPlace);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
              {record.issuedOn && (
                <Stack spacing={2} alignItems='center' direction='row'>
                  <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                    <InputLabel htmlFor='outlined-adornment-username'>
                      Issued On
                    </InputLabel>
                    <OutlinedInput
                      value={record.issuedOn}
                      id='outlined-adornment-username'
                      label={"Issued On"}
                    />
                  </FormControl>
                  <Button
                    size='large'
                    variant='contained'
                    onClick={() => {
                      copyToClipboard(record.issuedOn);
                    }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
            </>
          )}
          {others && (
            <Typography width='50%' variant='h6' gutterBottom>
              Others:
            </Typography>
          )}
          {others &&
            others.map((item: any) => (
              <Stack
                key={item.key}
                spacing={2}
                alignItems='center'
                direction='row'
              >
                <FormControl sx={{ m: 1, width: 500 }} variant='outlined'>
                  <InputLabel htmlFor='outlined-adornment-url'>
                    {item.key}
                  </InputLabel>
                  <OutlinedInput
                    value={item.value}
                    id='outlined-adornment-url'
                    label={item.key}
                  />
                </FormControl>
                <Button
                  sx={item.type !== "password" ? { visibility: "hidden" } : {}}
                  size='large'
                  variant='contained'
                  onClick={() => {
                    copyToClipboard(item.value);
                  }}
                >
                  Copy
                </Button>
              </Stack>
            ))}
        </>
      )}
      {!record && !encryptedData && (
        <Stack spacing={1} direction='row'>
          <Typography variant='h6'>Progress: {progress * 100}%</Typography>
        </Stack>
      )}
      <Stack spacing={1} direction='row'>
        <video id='video' style={{ width: 800, height: 800 }}></video>
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
        autoHideDuration={3000}
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
    </Stack>
  );
}
