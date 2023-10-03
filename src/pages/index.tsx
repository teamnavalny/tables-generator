import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  Center,
  Container,
  Heading,
  HStack,
  Icon,
  Spacer,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";
import { useDropzone } from "react-dropzone";
import { AiFillFileAdd, AiFillFile, AiOutlineDownload } from "react-icons/ai";
import saveAs from "file-saver";

const ACCEPTED_FILE_EXTENSION = ".xlsx";
const ACCEPTED_FILE_TYPES = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ACCEPTED_FILE_EXTENSION,
  ],
};

type UploadedFile = {
  file: File;
  loading: boolean;
  blob?: Blob;
};

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onFileUpload = useCallback(
    (acceptedFiles: File[]) => {
      const uploadedFiles = acceptedFiles.map((file) => ({
        file,
        loading: true,
      }));
      setFiles((files) => [...files, ...uploadedFiles]);
      uploadedFiles.map(async (file) => {
        const blob = await downloadScreenshot(file.file);
        setFiles((files) => {
          return files.map((current) => {
            if (current.file === file.file) {
              current.blob = blob;
              current.loading = false;
            }
            return current;
          });
        });
      });
    },
    [setFiles]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: onFileUpload,
    accept: ACCEPTED_FILE_TYPES,
    useFsAccessApi: false,
    onError: (e) => console.error(e),
  });

  const dropText = isDragActive
    ? "Drop the files here ..."
    : "Drag & Drop .xlsx files here, or click to select files";

  const downloadAll = () => {
    files.map((uploadedFile) => uploadedFile.blob && saveAs(uploadedFile.blob));
  };

  return (
    <Container variant="md" py={8} px={4}>
      <Stack spacing={8}>
        <Stack spacing={1}>
          <Heading size="md">Excel screenshoter</Heading>
          <Text size="sm">
            Upload .xlsx files and it will be converted into html table and
            generate a screenshot of this table in .png format.
          </Text>
        </Stack>
        <Center
          p={10}
          cursor="pointer"
          bg={isDragActive ? "gray.100" : "transparent"}
          _hover={{ bg: "gray.100" }}
          transition="background-color 0.2s ease"
          borderRadius={4}
          border="3px dashed"
          borderColor={isDragActive ? "teal.300" : "gray.300"}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <Icon as={AiFillFileAdd} mr={2} />
          <p>{dropText}</p>
        </Center>
        <Button
          variant="solid"
          colorScheme="blue"
          width="full"
          leftIcon={<FaFileUpload />}
          onClick={open}
        >
          Upload XLSX
        </Button>
        <Stack spacing={2}>
          {files.map((uploadedFile, index) => (
            <HStack
              spacing={2}
              borderWidth={2}
              borderRadius={4}
              px={4}
              py={1}
              key={index}
            >
              <AiFillFile />
              <Box as="span">
                {uploadedFile.file.name.replace(
                  ACCEPTED_FILE_EXTENSION,
                  ".png"
                )}
              </Box>
              <Spacer />
              <Button
                isLoading={uploadedFile.loading}
                onClick={() => uploadedFile.blob && saveAs(uploadedFile.blob)}
                size="sm"
                variant="ghost"
                p={2}
              >
                <AiOutlineDownload />
              </Button>
            </HStack>
          ))}
          {files.length !== 0 && (
            <Button colorScheme="blue" width="full" onClick={downloadAll}>
              Download all
            </Button>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function downloadScreenshot(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return await fetch(`${BACKEND_URL}/api/screenshot-excel`, {
    method: "POST",
    body: formData,
  }).then((res) => res.blob());
}
